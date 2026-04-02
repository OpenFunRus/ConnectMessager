namespace ConnectMessager.Desktop.Interop;

public static class DesktopBridgeScript
{
    public const string Content =
        """
        (() => {
            if (window.ConnectMessagerDesktop) {
                return;
            }

            const subscribers = new Map();

            const send = (type, payload = {}) => {
                if (!window.chrome || !window.chrome.webview) {
                    return false;
                }

                window.chrome.webview.postMessage({ type, payload });
                return true;
            };

            const on = (type, callback) => {
                if (!subscribers.has(type)) {
                    subscribers.set(type, []);
                }

                subscribers.get(type).push(callback);
            };

            const dispatch = (message) => {
                if (!message || !message.type || !subscribers.has(message.type)) {
                    return;
                }

                for (const callback of subscribers.get(message.type)) {
                    try {
                        callback(message.payload);
                    } catch (error) {
                        console.error("ConnectMessagerDesktop subscriber failed", error);
                    }
                }
            };

            window.chrome?.webview?.addEventListener("message", (event) => {
                dispatch(event.data);
            });

            window.ConnectMessagerDesktop = {
                send,
                on,
                notify: (title, message, options = {}) => send("desktop.notification.show", { title, message, ...options }),
                flashWindow: () => send("desktop.window.flash"),
                focusWindow: () => send("desktop.window.focus"),
                setWindowTitle: (title) => send("desktop.window.set-title", { title }),
                setUnreadCount: (count) => send("desktop.badge.set", { count }),
                openExternal: (url) => send("desktop.external.open", { url }),
                requestAppInfo: () => send("desktop.info.request")
            };

            send("desktop.app.ready", { href: window.location.href, userAgent: navigator.userAgent });
        })();
        """;
}
