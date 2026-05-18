"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import type { AppVideo } from "@/lib/types";

type ApiResponse = {
  videos?: AppVideo[];
  favorites?: string[];
  authRequired?: boolean;
  loginUrl?: string;
  error?: string;
};

type ToastState = {
  text: string;
  kind: "success" | "error";
};

const YOUTUBE_WEB_URL = "https://www.youtube.com/playlist?list=PLCu_6zERhvNEkhTw19SHuTCQ66vzBvdRr";
const YOUTUBE_IOS_URL = "youtube://www.youtube.com/playlist?list=PLCu_6zERhvNEkhTw19SHuTCQ66vzBvdRr";
const YOUTUBE_ANDROID_URL =
  "intent://www.youtube.com/playlist?list=PLCu_6zERhvNEkhTw19SHuTCQ66vzBvdRr#Intent;package=com.google.android.youtube;scheme=https;end";

const getSeenIds = () => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem("yts_seen_ids") ?? "[]"));
  } catch {
    return new Set<string>();
  }
};

const getCachedVideos = () => {
  try {
    const data = localStorage.getItem("yts_cached_data");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const isStandalonePwa = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const standaloneNavigator = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || standaloneNavigator.standalone === true;
};

const setCachedVideos = (data: { videos: AppVideo[]; favorites: string[] }) => {
  try {
    localStorage.setItem("yts_cached_data", JSON.stringify(data));
  } catch {
    // Ignore if localStorage fails
  }
};

const clearVideoCache = () => {
  try {
    localStorage.removeItem("yts_cached_data");
  } catch {
    // Ignore if localStorage fails
  }
};

const isMobileDevice = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  return isAndroid || isIOS;
};

export default function HomePage() {
  const [videos, setVideos] = useState<AppVideo[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [loginUrl, setLoginUrl] = useState("/api/oauth/start");
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [dimEnabled, setDimEnabled] = useState(true);
  const [favFilterEnabled, setFavFilterEnabled] = useState(false);
  const [excludeFavEnabled, setExcludeFavEnabled] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);

  const toastTimer = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Handle OAuth success callback
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("auth_success") === "true") {
      localStorage.setItem("yts_auth_timestamp", String(Date.now()));
      // Remove the param from URL
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    setDimEnabled(localStorage.getItem("yts_dimming_enabled") !== "false");
    setFavFilterEnabled(localStorage.getItem("yts_fav_filter_enabled") === "true");
    setExcludeFavEnabled(localStorage.getItem("yts_exclude_fav_enabled") === "true");
    setSeenIds(getSeenIds());
  }, []);

  useEffect(() => {
    localStorage.setItem("yts_dimming_enabled", String(dimEnabled));
  }, [dimEnabled]);

  useEffect(() => {
    localStorage.setItem("yts_fav_filter_enabled", String(favFilterEnabled));
  }, [favFilterEnabled]);

  useEffect(() => {
    localStorage.setItem("yts_exclude_fav_enabled", String(excludeFavEnabled));
  }, [excludeFavEnabled]);

  useEffect(() => {
    let previousScrollY = window.scrollY;

    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const isNearTop = currentScrollY < 12;
      const isScrollingUp = currentScrollY < previousScrollY;

      setIsNavbarVisible(isNearTop || isScrollingUp);
      previousScrollY = currentScrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setIsLoading(true);

      try {
        const shouldRefresh = refreshFlag > 0 || isStandalonePwa();
        const response = await fetch(`/api/videos${shouldRefresh ? "?refresh=true" : ""}`, {
          cache: "no-store"
        });

        const data = (await response.json()) as ApiResponse;
        if (ignore) {
          return;
        }

        if (response.status === 401 && data.authRequired) {
          // Check if we have cached data to show while offline
          const cached = getCachedVideos();
          if (cached) {
            setVideos(cached.videos);
            setFavorites(cached.favorites);
            showToast("Usando datos en caché", "success");
          } else {
            setAuthRequired(true);
            setLoginUrl(data.loginUrl ?? "/api/oauth/start");
            setVideos([]);
            setFavorites([]);
          }
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          const cached = getCachedVideos();
          if (cached) {
            setVideos(cached.videos);
            setFavorites(cached.favorites);
            showToast("Usando datos en caché", "success");
          } else {
            showToast(data.error ?? "Error loading videos", "error");
          }
          setIsLoading(false);
          return;
        }

        setAuthRequired(false);
        const newData = { videos: data.videos ?? [], favorites: data.favorites ?? [] };
        setVideos(newData.videos);
        setFavorites(newData.favorites);
        setCachedVideos(newData);
        setIsLoading(false);
      } catch (error) {
        // Network error - try to use cached data
        const cached = getCachedVideos();
        if (cached) {
          setVideos(cached.videos);
          setFavorites(cached.favorites);
          showToast("Usando datos en caché (sin conexión)", "success");
        } else {
          showToast("Error de conexión", "error");
        }
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [refreshFlag]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
      }
      if (longPressTimer.current) {
        window.clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const visibleVideos = useMemo(() => {
    if (favFilterEnabled) {
      return videos.filter((v) => favorites.includes(v.channelTitle));
    }

    if (excludeFavEnabled) {
      return videos.filter((v) => !favorites.includes(v.channelTitle));
    }

    return videos;
  }, [videos, favorites, favFilterEnabled, excludeFavEnabled]);

  const showToast = (text: string, kind: "success" | "error") => {
    setToast({ text, kind });
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const handleAddWatchLater = async (videoId: string) => {
    const response = await fetch(`/api/watch-later/${videoId}`, { method: "POST" });
    const data = (await response.json()) as { success?: boolean; message?: string };

    if (response.ok && data.success) {
      showToast("Saved", "success");
      return;
    }

    showToast(data.message ?? "Error", "error");
  };

  const markSeen = useCallback((videoId: string) => {
    setSeenIds((prev) => {
      if (prev.has(videoId)) {
        return prev;
      }

      const next = new Set(prev);
      next.add(videoId);
      localStorage.setItem("yts_seen_ids", JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const setCardRef = useCallback(
    (videoId: string) => (node: HTMLElement | null) => {
      if (!node) {
        cardRefs.current.delete(videoId);
        return;
      }

      cardRefs.current.set(videoId, node);
    },
    []
  );

  useEffect(() => {
    if (visibleVideos.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const element = entry.target as HTMLElement;
          const videoId = element.dataset.videoId;
          if (!videoId) {
            return;
          }

          markSeen(videoId);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    visibleVideos.forEach((video) => {
      if (seenIds.has(video.id)) {
        return;
      }

      const card = cardRefs.current.get(video.id);
      if (card) {
        observer.observe(card);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [visibleVideos, seenIds, markSeen]);

  const startLongPress = (videoId: string) => {
    longPressTimer.current = window.setTimeout(() => {
      void handleAddWatchLater(videoId);
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const openYouTube = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isMobileDevice()) {
      return;
    }

    event.preventDefault();

    const userAgent = navigator.userAgent;
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

    if (isAndroid) {
      window.location.href = YOUTUBE_ANDROID_URL;
      return;
    }

    if (isIOS) {
      window.location.href = YOUTUBE_IOS_URL;
      window.setTimeout(() => {
        window.location.href = YOUTUBE_WEB_URL;
      }, 1200);
    }
  };

  return (
    <>
      <header className={`app-header ${isNavbarVisible ? "visible" : "hidden"}`}>
        <a
          className="brand-link"
          href={YOUTUBE_WEB_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Abrir YouTube"
          onClick={openYouTube}
        >
          <img className="brand-logo" src="/youtube-logo.svg" alt="YouTube" width={43} height={24} />
        </a>

        <div className="controls">
          <button
            className={`ctrl-icon ${favFilterEnabled ? "active" : ""}`}
            title="Solo favoritos"
            onClick={() => {
              setFavFilterEnabled((prev) => {
                const next = !prev;
                if (next) {
                  setExcludeFavEnabled(false);
                }
                return next;
              });
            }}
          >
            <i className="fa-solid fa-star" />
          </button>

          <label className="switch inverted" title="Solo favoritos">
            <input
              type="checkbox"
              checked={favFilterEnabled}
              onChange={(event) => {
                const checked = event.target.checked;
                setFavFilterEnabled(checked);
                if (checked) {
                  setExcludeFavEnabled(false);
                }
              }}
            />
            <span className="slider" />
          </label>

          <button
            className={`ctrl-icon ${excludeFavEnabled ? "active" : ""}`}
            title="Ocultar favoritos"
            onClick={() => {
              setExcludeFavEnabled((prev) => {
                const next = !prev;
                if (next) {
                  setFavFilterEnabled(false);
                }
                return next;
              });
            }}
          >
            <i className="fa-solid fa-eye-slash" />
          </button>

          <div className="separator" />

          <button
            className={`ctrl-icon ${dimEnabled ? "active" : ""}`}
            title="Atenuar vistos"
            onClick={() => setDimEnabled((prev) => !prev)}
          >
            <i className="fa-solid fa-circle-half-stroke" />
          </button>

          <label className="switch" title="Atenuar vistos">
            <input
              type="checkbox"
              checked={dimEnabled}
              onChange={(event) => setDimEnabled(event.target.checked)}
            />
            <span className="slider" />
          </label>

          <div className="separator" />

          <button className="ctrl-icon" title="Actualizar" onClick={() => setRefreshFlag((x) => x + 1)}>
            <i className="fa-solid fa-rotate-right" />
          </button>
        </div>
      </header>

      <main className="main">
        {isLoading ? <div className="empty-state">Loading...</div> : null}

        {!isLoading && authRequired ? (
          <div className="empty-state">
            <i className="fa-solid fa-lock" />
            <p>No hay sesión activa</p>
            <p>
              <a href={loginUrl}>Iniciar sesión con Google</a>
            </p>
          </div>
        ) : null}

        {!isLoading && !authRequired && visibleVideos.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-video-slash" />
            <p>No se encontraron videos recientes.</p>
          </div>
        ) : null}

        {!isLoading && !authRequired && visibleVideos.length > 0 ? (
          <section className="grid">
            {visibleVideos.map((video) => {
              const isSeen = seenIds.has(video.id);

              return (
                <article
                  key={video.id}
                  ref={setCardRef(video.id)}
                  data-video-id={video.id}
                  className={`video-card ${dimEnabled && isSeen ? "seen" : ""}`}
                  onMouseDown={() => startLongPress(video.id)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => startLongPress(video.id)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                >
                  <a
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => markSeen(video.id)}
                  >
                    <div className="thumb-wrap">
                      <img src={video.thumbnail} alt={video.title} loading="lazy" />
                    </div>
                  </a>
                  <div className="info">
                    <a
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => markSeen(video.id)}
                    >
                      <div className="title" title={video.title}>
                        {video.title}
                      </div>
                    </a>
                    <div className="meta-row">
                      <div className="channel" title={video.channelTitle}>
                        {video.channelTitle}
                      </div>
                      <button
                        className="watch-btn"
                        title="Watch Later"
                        onClick={() => void handleAddWatchLater(video.id)}
                      >
                        <i className="fa-regular fa-clock" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
      </main>

      <div className={`toast ${toast ? `show ${toast.kind}` : ""}`}>{toast?.text ?? ""}</div>
    </>
  );
}
