#pragma once

#include <QFileInfo>
#include <QLabel>
#include <QWidget>

namespace Ixplorer {

class StatusStrip : public QWidget {
    Q_OBJECT
public:
    explicit StatusStrip(QWidget *parent = nullptr);

    void setItemCount(int count);
    void setSelectionInfo(const QFileInfo &info, int selectedCount, quint64 selectedBytes);
    void clearSelectionInfo();
    void setPath(const QString &path);
    void setStatusMessage(const QString &message);

private:
    QLabel *m_itemCountLabel;
    QLabel *m_selectionLabel;
    QLabel *m_statusLabel;
    QLabel *m_pathLabel;
};

} // namespace Ixplorer
