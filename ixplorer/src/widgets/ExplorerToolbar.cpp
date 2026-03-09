#include "widgets/ExplorerToolbar.h"
#include "widgets/BreadcrumbBar.h"

#include <QHBoxLayout>

namespace Ixplorer {

ExplorerToolbar::ExplorerToolbar(QWidget *parent)
    : QWidget(parent)
    , m_backBtn(new QPushButton(QStringLiteral("\u2190"), this))
    , m_fwdBtn(new QPushButton(QStringLiteral("\u2192"), this))
    , m_upBtn(new QPushButton(QStringLiteral("\u2191"), this))
    , m_refreshBtn(new QPushButton(QStringLiteral("\u21BB"), this))
    , m_breadcrumb(new BreadcrumbBar(this))
    , m_searchField(new QLineEdit(this)) {
    setObjectName("ExplorerToolbar");

    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(8, 4, 8, 4);
    layout->setSpacing(4);

    m_backBtn->setToolTip("Back (Alt+Left)");
    m_fwdBtn->setToolTip("Forward (Alt+Right)");
    m_upBtn->setToolTip("Up (Alt+Up)");
    m_refreshBtn->setToolTip("Refresh (F5)");

    layout->addWidget(m_backBtn);
    layout->addWidget(m_fwdBtn);
    layout->addWidget(m_upBtn);
    layout->addWidget(m_refreshBtn);
    layout->addSpacing(8);
    layout->addWidget(m_breadcrumb, 1);
    layout->addSpacing(8);

    m_searchField->setObjectName("SearchField");
    m_searchField->setPlaceholderText("Search files...");
    m_searchField->setFixedWidth(220);
    layout->addWidget(m_searchField);

    connect(m_backBtn, &QPushButton::clicked, this, &ExplorerToolbar::backRequested);
    connect(m_fwdBtn, &QPushButton::clicked, this, &ExplorerToolbar::forwardRequested);
    connect(m_upBtn, &QPushButton::clicked, this, &ExplorerToolbar::upRequested);
    connect(m_refreshBtn, &QPushButton::clicked, this, &ExplorerToolbar::refreshRequested);

    connect(m_breadcrumb, &BreadcrumbBar::navigateRequested,
            this, &ExplorerToolbar::navigateRequested);

    connect(m_searchField, &QLineEdit::returnPressed, this, [this]() {
        emit searchRequested(m_searchField->text());
    });

    updateNavButtons();
}

void ExplorerToolbar::setCurrentPath(const QString &path) {
    m_breadcrumb->setPath(path);
}

void ExplorerToolbar::pushHistory(const QString &path) {
    if (m_navigating)
        return;

    // Trim forward history
    if (m_historyIndex < m_history.size() - 1)
        m_history = m_history.mid(0, m_historyIndex + 1);

    m_history.append(path);
    m_historyIndex = m_history.size() - 1;
    updateNavButtons();
}

bool ExplorerToolbar::canGoBack() const {
    return m_historyIndex > 0;
}

bool ExplorerToolbar::canGoForward() const {
    return m_historyIndex < m_history.size() - 1;
}

QString ExplorerToolbar::goBack() {
    if (!canGoBack())
        return {};
    m_navigating = true;
    m_historyIndex--;
    updateNavButtons();
    QString path = m_history[m_historyIndex];
    m_navigating = false;
    return path;
}

QString ExplorerToolbar::goForward() {
    if (!canGoForward())
        return {};
    m_navigating = true;
    m_historyIndex++;
    updateNavButtons();
    QString path = m_history[m_historyIndex];
    m_navigating = false;
    return path;
}

void ExplorerToolbar::updateNavButtons() {
    m_backBtn->setEnabled(canGoBack());
    m_fwdBtn->setEnabled(canGoForward());
}

} // namespace Ixplorer
