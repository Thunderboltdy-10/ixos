#pragma once

#include <QWidget>
#include <QLabel>
#include <QLineEdit>
#include <QFileInfo>

namespace Ixplorer {

class IxosRail : public QWidget {
    Q_OBJECT
public:
    explicit IxosRail(QWidget *parent = nullptr);

    void showFileDetails(const QFileInfo &info);
    void clearDetails();

private:
    QLabel *m_fileIcon;
    QLabel *m_fileName;
    QLabel *m_fileSize;
    QLabel *m_fileModified;
    QLabel *m_fileType;
    QLineEdit *m_searchInput;
    QLabel *m_relatedPlaceholder;
    QLabel *m_contextPlaceholder;
    QLabel *m_actionsPlaceholder;
};

} // namespace Ixplorer
