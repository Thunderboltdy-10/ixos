#pragma once

#include <QWidget>
#include <QLabel>

namespace Ixplorer {

class StatusStrip : public QWidget {
    Q_OBJECT
public:
    explicit StatusStrip(QWidget *parent = nullptr);

    void setItemCount(int count);
    void setSelectionInfo(const QString &info);
    void setPath(const QString &path);

private:
    QLabel *m_itemCountLabel;
    QLabel *m_selectionLabel;
    QLabel *m_pathLabel;
};

} // namespace Ixplorer
