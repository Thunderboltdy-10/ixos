#pragma once

#include <QWidget>

class QLabel;
class QPropertyAnimation;
class QTimer;

namespace Ixplorer {

class ToastNotification : public QWidget {
    Q_OBJECT
public:
    explicit ToastNotification(QWidget *parent = nullptr);
    static void showToast(QWidget *parent, const QString &message);

public slots:
    void showMessage(const QString &message);

protected:
    void paintEvent(QPaintEvent *event) override;

private slots:
    void slideDown();

private:
    QLabel *m_label;
    QPropertyAnimation *m_anim;
    QTimer *m_dismissTimer;
};

} // namespace Ixplorer
