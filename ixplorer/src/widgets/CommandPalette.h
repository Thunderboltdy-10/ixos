#pragma once

#include <QDialog>
#include <QListWidget>
#include <QLineEdit>
#include <QString>
#include <QVector>

namespace Ixplorer {

struct CommandPaletteItem {
    QString id;
    QString title;
    QString subtitle;
    QString keywords;
};

class CommandPalette : public QDialog {
    Q_OBJECT
public:
    explicit CommandPalette(QWidget *parent = nullptr);

    void setCommands(const QVector<CommandPaletteItem> &commands);

signals:
    void searchRequested(const QString &query);
    void commandTriggered(const QString &commandId);

protected:
    void showEvent(QShowEvent* event) override;
    void resizeEvent(QResizeEvent* event) override;

private:
    void rebuildList();
    void triggerCurrent();
    bool eventFilter(QObject *watched, QEvent *event) override;

    QVector<CommandPaletteItem> m_commands;
    QLineEdit *m_input;
    QListWidget *m_list;
};

} // namespace Ixplorer
