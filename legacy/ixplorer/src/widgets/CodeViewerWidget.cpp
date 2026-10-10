#include "CodeViewerWidget.h"
#include <QPainter>
#include <QTextBlock>
#include <QSyntaxHighlighter>
#include <QRegularExpression>
#include <utility>

namespace Ixplorer {

class SimpleHighlighter : public QSyntaxHighlighter {
public:
    SimpleHighlighter(QTextDocument *parent = nullptr) : QSyntaxHighlighter(parent) {
        HighlightingRule rule;
        keywordFormat.setForeground(QColor(86, 156, 214));
        keywordFormat.setFontWeight(QFont::Bold);

        const QString keywordPatterns[] = {
            QStringLiteral("\\bclass\\b"), QStringLiteral("\\bconst\\b"), QStringLiteral("\\bauto\\b"),
            QStringLiteral("\\bfor\\b"), QStringLiteral("\\bwhile\\b"), QStringLiteral("\\bif\\b"),
            QStringLiteral("\\belse\\b"), QStringLiteral("\\breturn\\b"), QStringLiteral("\\bstruct\\b"),
            QStringLiteral("\\bnamespace\\b"), QStringLiteral("\\bpublic\\b"), QStringLiteral("\\bprivate\\b"),
            QStringLiteral("\\bprotected\\b"), QStringLiteral("\\bimport\\b"), QStringLiteral("\\bfrom\\b"),
            QStringLiteral("\\bfunction\\b"), QStringLiteral("\\bvar\\b"), QStringLiteral("\\blet\\b"),
            QStringLiteral("\\bdef\\b")
        };

        for (const QString &pattern : keywordPatterns) {
            rule.pattern = QRegularExpression(pattern);
            rule.format = keywordFormat;
            highlightingRules.append(rule);
        }
        
        stringFormat.setForeground(QColor(206, 145, 120));
        rule.pattern = QRegularExpression(QStringLiteral("\".*\""));
        rule.format = stringFormat;
        highlightingRules.append(rule);
        
        rule.pattern = QRegularExpression(QStringLiteral("'.*'"));
        rule.format = stringFormat;
        highlightingRules.append(rule);

        commentFormat.setForeground(QColor(106, 153, 85));
        rule.pattern = QRegularExpression(QStringLiteral("//[^\n]*"));
        rule.format = commentFormat;
        highlightingRules.append(rule);
        
        rule.pattern = QRegularExpression(QStringLiteral("#[^\n]*"));
        rule.format = commentFormat;
        highlightingRules.append(rule);
    }

protected:
    void highlightBlock(const QString &text) override {
        for (const HighlightingRule &rule : std::as_const(highlightingRules)) {
            QRegularExpressionMatchIterator matchIterator = rule.pattern.globalMatch(text);
            while (matchIterator.hasNext()) {
                QRegularExpressionMatch match = matchIterator.next();
                setFormat(match.capturedStart(), match.capturedLength(), rule.format);
            }
        }
    }

private:
    struct HighlightingRule {
        QRegularExpression pattern;
        QTextCharFormat format;
    };
    QVector<HighlightingRule> highlightingRules;
    QTextCharFormat keywordFormat;
    QTextCharFormat stringFormat;
    QTextCharFormat commentFormat;
};

CodeViewerWidget::CodeViewerWidget(QWidget *parent) : QPlainTextEdit(parent) {
    m_lineNumberArea = new LineNumberArea(this);

    setReadOnly(true);
    setFont(QFont(QStringLiteral("Geist Mono"), 12));
    setStyleSheet("QPlainTextEdit { background-color: #14161a; color: #cccccc; border: none; }");

    connect(this, &CodeViewerWidget::blockCountChanged, this, &CodeViewerWidget::updateLineNumberAreaWidth);
    connect(this, &CodeViewerWidget::updateRequest, this, &CodeViewerWidget::updateLineNumberArea);
    connect(this, &CodeViewerWidget::cursorPositionChanged, this, &CodeViewerWidget::highlightCurrentLine);

    updateLineNumberAreaWidth(0);
    highlightCurrentLine();
    new SimpleHighlighter(document());
}

int CodeViewerWidget::lineNumberAreaWidth() {
    int digits = 1;
    int max = qMax(1, blockCount());
    while (max >= 10) {
        max /= 10;
        ++digits;
    }

    int space = 13 + fontMetrics().horizontalAdvance(QLatin1Char('9')) * digits;
    return space;
}

void CodeViewerWidget::updateLineNumberAreaWidth(int /* newBlockCount */) {
    setViewportMargins(lineNumberAreaWidth(), 0, 0, 0);
}

void CodeViewerWidget::updateLineNumberArea(const QRect &rect, int dy) {
    if (dy)
        m_lineNumberArea->scroll(0, dy);
    else
        m_lineNumberArea->update(0, rect.y(), m_lineNumberArea->width(), rect.height());

    if (rect.contains(viewport()->rect()))
        updateLineNumberAreaWidth(0);
}

void CodeViewerWidget::resizeEvent(QResizeEvent *event) {
    QPlainTextEdit::resizeEvent(event);

    QRect cr = contentsRect();
    m_lineNumberArea->setGeometry(QRect(cr.left(), cr.top(), lineNumberAreaWidth(), cr.height()));
}

void CodeViewerWidget::highlightCurrentLine() {
    if (isReadOnly())
        return;

    QList<QTextEdit::ExtraSelection> extraSelections;

    if (!isReadOnly()) {
        QTextEdit::ExtraSelection selection;
        QColor lineColor = QColor(255, 255, 0, 20); // Not really used in read only but good practice
        selection.format.setBackground(lineColor);
        selection.format.setProperty(QTextFormat::FullWidthSelection, true);
        selection.cursor = textCursor();
        selection.cursor.clearSelection();
        extraSelections.append(selection);
    }
    setExtraSelections(extraSelections);
}

void CodeViewerWidget::lineNumberAreaPaintEvent(QPaintEvent *event) {
    QPainter painter(m_lineNumberArea);
    painter.fillRect(event->rect(), QColor(24, 26, 30));

    QTextBlock block = firstVisibleBlock();
    int blockNumber = block.blockNumber();
    int top = qRound(blockBoundingGeometry(block).translated(contentOffset()).top());
    int bottom = top + qRound(blockBoundingRect(block).height());

    while (block.isValid() && top <= event->rect().bottom()) {
        if (block.isVisible() && bottom >= event->rect().top()) {
            QString number = QString::number(blockNumber + 1);
            painter.setPen(QColor(100, 100, 100));
            painter.drawText(0, top, m_lineNumberArea->width() - 5, fontMetrics().height(),
                             Qt::AlignRight | Qt::AlignVCenter, number);
        }

        block = block.next();
        top = bottom;
        bottom = top + qRound(blockBoundingRect(block).height());
        ++blockNumber;
    }
}

} // namespace Ixplorer
