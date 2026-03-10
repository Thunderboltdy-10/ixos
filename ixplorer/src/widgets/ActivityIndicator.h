#pragma once
#include <QWidget>
#include <QTimer>

namespace Ixplorer {

class ActivityIndicator : public QWidget {
    Q_OBJECT
public:
    explicit ActivityIndicator(QWidget* parent = nullptr);

    void setStatus(int status); // 0=ready/green, 1=searching/amber, 2=error/red

protected:
    void paintEvent(QPaintEvent* event) override;

private:
    QTimer* m_timer;
    bool m_pulseOn = true;
    int m_status = 0;
};

}
