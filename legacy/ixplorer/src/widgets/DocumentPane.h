#pragma once

#include "utils/FileOpenPolicy.h"

#include <QFileInfo>
#include <QColor>
#include <QWidget>

class QHideEvent;
class QLabel;
class QPushButton;
class QResizeEvent;
class QShowEvent;
class QTimer;
class QVBoxLayout;
class QGraphicsView;
class QGraphicsScene;
class QGraphicsPixmapItem;

#ifdef QT_WEBENGINEWIDGETS_LIB
class QWebEngineView;
#endif

#ifdef QT_MULTIMEDIA_LIB
class QMediaPlayer;
class QVideoWidget;
class QAudioOutput;
#endif

#ifdef QT_PDF_LIB
class QPdfDocument;
class QPdfView;
#endif

#if defined(Q_OS_WIN) && defined(QT_AXCONTAINER_LIB)
class QAxWidget;
#endif

namespace Ixplorer {

class CodeViewerWidget;

class DocumentPane : public QWidget {
    Q_OBJECT
public:
    explicit DocumentPane(const QString &path, bool previewMode, QWidget *parent = nullptr, bool launchDeferred = false);
    ~DocumentPane() override;

    enum HostMode { WebView, MediaPlayer, ImageViewer, CodeViewer, PdfViewer, WindowEmbed, OfficeEmbed, Fallback };

    QString filePath() const { return m_filePath; }
    QString displayPath() const { return m_filePath; }
    FileOpenPolicy policy() const { return m_policy; }
    bool isPreviewTab() const { return m_previewMode; }
    bool isDirty() const { return false; }
    bool canReusePreviewTab() const;
    bool canPromoteToEditable() const { return false; }
    bool canClose();
    bool canGoUp() const;
    bool isHosted() const { return m_hostedReady || m_hostMode == ImageViewer || m_hostMode == CodeViewer || m_hostMode == WebView || m_hostMode == MediaPlayer || m_hostMode == PdfViewer || m_hostMode == OfficeEmbed; }

    void setPreviewMode(bool previewMode);
    void reload();
    bool save() { return false; }
    void focusPrimaryControl();
    QColor surfaceTone() const { return m_surfaceTone; }

signals:
    void pathChanged(const QString &path);
    void selectionChanged(const QFileInfo &info, int selectedCount, quint64 selectedBytes);
    void statusMessage(const QString &message);
    void openExternallyRequested(const QString &path);
    void surfaceToneChanged(const QColor &color);

protected:
    void showEvent(QShowEvent *event) override;
    void hideEvent(QHideEvent *event) override;
    void resizeEvent(QResizeEvent *event) override;
    bool eventFilter(QObject *watched, QEvent *event) override;

private:
    void buildUi();
    bool startHosting();
    bool setupHostFailureFallback();
    void clearHostedSurface(bool terminateProcess = true);
    void setHostedWindowVisible(bool visible);
    void updateHostedGeometry();
    void handleHostedWindowHeartbeat();
    bool tryRecoverHostedWindow();
    void refreshHostedBackdrop();
    void applyHostedBackdrop(const QColor &color);
    void showStateMessage(const QString &title, const QString &body);
    void syncUiState();
    void setupWebView();
    void setupPdfViewer();
    void setupMediaPlayer();
    void setupImageViewer();
    void setupCodeViewer();
    void setupOfficeEmbed();

    QString m_filePath;
    FileOpenPolicy m_policy;
    QColor m_surfaceTone = QColor(24, 26, 30);
    bool m_previewMode = false;
    bool m_launchDeferred = false;
    bool m_hostedReady = false;
    HostMode m_hostMode = Fallback;

    QWidget *m_contentRoot = nullptr;
    QVBoxLayout *m_contentLayout = nullptr;
    QWidget *m_hostFrame = nullptr;
    QWidget *m_hostSurface = nullptr;
    QWidget *m_stateCard = nullptr;
    QLabel *m_stateTitle = nullptr;
    QLabel *m_stateBody = nullptr;
    QPushButton *m_externalButton = nullptr;
    
    QGraphicsView *m_graphicsView = nullptr;
    QGraphicsScene *m_graphicsScene = nullptr;
    QGraphicsPixmapItem *m_pixmapItem = nullptr;
    CodeViewerWidget *m_codeViewer = nullptr;

#ifdef QT_WEBENGINEWIDGETS_LIB
    QWebEngineView *m_webView = nullptr;
#endif

#ifdef QT_MULTIMEDIA_LIB
    QMediaPlayer *m_mediaPlayer = nullptr;
    QAudioOutput *m_audioOutput = nullptr;
    QVideoWidget *m_videoWidget = nullptr;
#endif

#ifdef QT_PDF_LIB
    QPdfDocument *m_pdfDocument = nullptr;
    QPdfView *m_pdfView = nullptr;
#endif

#if defined(Q_OS_WIN) && defined(QT_AXCONTAINER_LIB)
    QAxWidget *m_axWidget = nullptr;
#endif

    QTimer *m_loadingTimer = nullptr;
    bool m_skeletonPhase = false;

    QTimer *m_hostMonitor = nullptr;
    WId m_hostedWindowId = 0;
    quintptr m_processHandle = 0;
    bool m_ownsHostedProcess = false;
    quintptr m_originalWindowParent = 0;
    qintptr m_originalWindowStyle = 0;
    qintptr m_originalWindowExStyle = 0;
    bool m_hostedWindowClaimed = false;
    int m_backdropRefreshTick = 0;
    int m_recoveryAttempts = 0;
    qint64 m_nextRecoveryAttemptMs = 0;
    QString m_hostedExecutable;
};

} // namespace Ixplorer
