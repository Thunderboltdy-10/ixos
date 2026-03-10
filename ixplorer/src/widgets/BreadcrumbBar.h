#pragma once

#include <QWidget>
#include <QHBoxLayout>
#include <QString>
#include <QLineEdit>

namespace Ixplorer {

class BreadcrumbBar : public QWidget {
    Q_OBJECT
public:
    explicit BreadcrumbBar(QWidget *parent = nullptr);

    void setPath(const QString &path);

signals:
    void navigateRequested(const QString &path);

protected:
    void resizeEvent(QResizeEvent *event) override;
    void mouseDoubleClickEvent(QMouseEvent *event) override;
    bool eventFilter(QObject *watched, QEvent *event) override;

private:
    void rebuild();
    void enterEditMode();
    void exitEditMode(bool accept);

    QHBoxLayout *m_layout;
    QString m_path;
    
    QLineEdit *m_editLine;
    bool m_editMode = false;
    int m_maxVisibleSegments = 5;
};

} // namespace Ixplorer
