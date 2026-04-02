using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;

namespace ConnectMessager.Desktop.Services;

public static class WindowAttentionService
{
    public static void Flash(Window window)
    {
        var handle = new WindowInteropHelper(window).Handle;
        if (handle == IntPtr.Zero)
        {
            return;
        }

        var flashInfo = new FLASHWINFO
        {
            cbSize = Convert.ToUInt32(Marshal.SizeOf<FLASHWINFO>()),
            hwnd = handle,
            dwFlags = FlashWindowFlags.FLASHW_ALL | FlashWindowFlags.FLASHW_TIMERNOFG,
            uCount = 3,
            dwTimeout = 0
        };

        _ = FlashWindowEx(ref flashInfo);
    }

    [DllImport("user32.dll")]
    private static extern bool FlashWindowEx(ref FLASHWINFO pwfi);

    [StructLayout(LayoutKind.Sequential)]
    private struct FLASHWINFO
    {
        public uint cbSize;
        public IntPtr hwnd;
        public FlashWindowFlags dwFlags;
        public uint uCount;
        public uint dwTimeout;
    }

    [Flags]
    private enum FlashWindowFlags : uint
    {
        FLASHW_STOP = 0,
        FLASHW_CAPTION = 1,
        FLASHW_TRAY = 2,
        FLASHW_ALL = FLASHW_CAPTION | FLASHW_TRAY,
        FLASHW_TIMER = 4,
        FLASHW_TIMERNOFG = 12
    }
}
