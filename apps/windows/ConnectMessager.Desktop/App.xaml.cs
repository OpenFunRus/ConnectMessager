using System.Windows;
using ConnectMessager.Desktop.Configuration;
using WpfApplication = System.Windows.Application;
using WpfMessageBox = System.Windows.MessageBox;

namespace ConnectMessager.Desktop;

public partial class App : WpfApplication
{
    private Mutex? _singleInstanceMutex;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        AppDomain.CurrentDomain.UnhandledException += OnUnhandledException;
        DispatcherUnhandledException += OnDispatcherUnhandledException;

        const string mutexName = @"Global\ConnectMessager.Desktop";
        _singleInstanceMutex = new Mutex(initiallyOwned: true, name: mutexName, createdNew: out var createdNew);

        if (!createdNew)
        {
            WpfMessageBox.Show(
                "ConnectMessager уже запущен на этом компьютере.",
                "ConnectMessager",
                MessageBoxButton.OK,
                MessageBoxImage.Information);
            Shutdown();
            return;
        }

        var settings = DesktopSettingsLoader.Load(AppContext.BaseDirectory, e.Args);
        var mainWindow = new MainWindow(settings);
        MainWindow = mainWindow;
        mainWindow.Show();
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _singleInstanceMutex?.ReleaseMutex();
        _singleInstanceMutex?.Dispose();
        _singleInstanceMutex = null;
        base.OnExit(e);
    }

    private void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
    {
        ShowFatalError(e.ExceptionObject as Exception);
    }

    private void OnDispatcherUnhandledException(object sender, System.Windows.Threading.DispatcherUnhandledExceptionEventArgs e)
    {
        ShowFatalError(e.Exception);
        e.Handled = true;
        Shutdown();
    }

    private static void ShowFatalError(Exception? exception)
    {
        var message = exception?.Message ?? "Неизвестная ошибка.";
        WpfMessageBox.Show(
            $"Desktop-клиент ConnectMessager завершился с ошибкой:\n\n{message}",
            "ConnectMessager",
            MessageBoxButton.OK,
            MessageBoxImage.Error);
    }
}

