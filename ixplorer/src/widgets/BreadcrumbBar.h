#pragma once

#include <QWidget>
#include <QHBoxLayout>
#include <QString>

namespace Ixplorer {

class BreadcrumbBar : public QWidget {
    Q_OBJECT
public:
    explicit BreadcrumbBar(QWidget *parent = nullptr);

    void setPath(const QString &path);

signals:
    void navigateRequested(const QString &path);

private:
    void rebuild();

    QHBoxLayout *m_layout;
    QString m_path;
};

} // namespace Ixplorer
