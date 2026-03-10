#pragma once

#include "utils/FileOpenPolicy.h"

#include <QFileInfo>
#include <QWidget>

class QHideEvent;
class QColor;
class QLabel;
class QPushButton;
class QResizeEvent;
class QShowEvent;
class QTimer;
class QVBoxLayout;

namespace Ixplorer {

class DocumentPane : public QWidget {
    Q_OBJECT
public:
    explicit DocumentPane(const QString &path, bool previewMode, QWidget *parent = nullptr);
    ~DocumentPane() override;

    QString filePath() const { return m_filePath; }
    QString displayPath() const { return m_filePath; }
    FileOpenPolicy policy() const { return m_policy; }
    bool isPreviewTab() const { return m_previewMode; }
    bool isDirty() const { return false; }
    bool canReusePreviewTab() const;
    bool canPromoteToEditable() const { return false; }
    bool canClose();
    bool canGoUp() const;
    bool isHosted() const { return m_hostedReady; }

    void setPreviewMode(bool previewMode);
    void reload();
    bool save() { return false; }
    void focusPrimaryControl();

signals:
    void pathChanged(const QString &path);
    void selectionChanged(const QFileInfo &info, int selectedCount, quint64 selectedBytes);
    void statusMessage(const QString &message);
    void openExternallyRequested(const QString &path);

protected:
    void showEvent(QShowEvent *event) override;
    void hideEvent(QHideEvent *event) override;
    void resizeEvent(QResizeEvent *event) override;

private:
    void buildUi();
    bool startHosting();
    void clearHostedSurface();
    void setHostedWindowVisible(bool visible);
    void updateHostedGeometry();
    void handleHostedWindowHeartbeat();
    void refreshHostedBackdrop();
    void applyHostedBackdrop(const QColor &color);
    void showStateMessage(const QString &title, const QString &body);
    void syncUiState();

    QString m_filePath;
    FileOpenPolicy m_policy;
    bool m_previewMode = false;
    bool m_hostedReady = false;

    QWidget *m_contentRoot = nullptr;
    QVBoxLayout *m_contentLayout = nullptr;
    QWidget *m_hostSurface = nullptr;
    QWidget *m_stateCard = nullptr;
    QLabel *m_stateTitle = nullptr;
    QLabel *m_stateBody = nullptr;
    QPushButton *m_externalButton = nullptr;
    QTimer *m_hostMonitor = nullptr;
    WId m_hostedWindowId = 0;
    quintptr m_processHandle = 0;
    quintptr m_originalWindowParent = 0;
    qintptr m_originalWindowStyle = 0;
    qintptr m_originalWindowExStyle = 0;
    int m_backdropRefreshTick = 0;
};

} // namespace Ixplorer
