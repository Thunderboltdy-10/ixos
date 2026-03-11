#pragma once

#include <QPlainTextEdit>

namespace Ixplorer {

class CodeViewerWidget : public QPlainTextEdit {
    Q_OBJECT
public:
    explicit CodeViewerWidget(QWidget *parent = nullptr);

    void lineNumberAreaPaintEvent(QPaintEvent *event);
    int lineNumberAreaWidth();

protected:
    void resizeEvent(QResizeEvent *event) override;

private slots:
    void updateLineNumberAreaWidth(int newBlockCount);
    void highlightCurrentLine();
    void updateLineNumberArea(const QRect &rect, int dy);

private:
    QWidget *m_lineNumberArea;
};

class LineNumberArea : public QWidget {
public:
    LineNumberArea(CodeViewerWidget *editor) : QWidget(editor), m_codeViewer(editor) {}

    QSize sizeHint() const override {
        return QSize(m_codeViewer->lineNumberAreaWidth(), 0);
    }

protected:
    void paintEvent(QPaintEvent *event) override {
        m_codeViewer->lineNumberAreaPaintEvent(event);
    }

private:
    CodeViewerWidget *m_codeViewer;
};

} // namespace Ixplorer
