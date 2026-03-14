#pragma once

#include <QFileInfo>
#include <QLabel>
#include <QWidget>
#include <QToolButton>

namespace Ixplorer {

class ActivityIndicator;

class StatusStrip : public QWidget {
    Q_OBJECT
public:
    explicit StatusStrip(QWidget *parent = nullptr);

    void setItemCount(int count);
    void setSelectionInfo(const QFileInfo &info, int selectedCount, quint64 selectedBytes);
    void clearSelectionInfo();
    void setPath(const QString &path);
    void setStatusMessage(const QString &message);
    void setStatusState(int state);
    void setRailVisible(bool visible);

signals:
    void toggleRailRequested();

private:
    ActivityIndicator *m_indicator;
    QLabel *m_itemCountLabel;
    QLabel *m_selectionLabel;
    QLabel *m_statusLabel;
    QLabel *m_pathLabel;
    QToolButton *m_toggleRailBtn;
};

} // namespace Ixplorer
