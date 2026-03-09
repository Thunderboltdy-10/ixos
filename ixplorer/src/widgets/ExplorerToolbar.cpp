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
    , m_searchField(new QLineEdit(this))
    , m_viewModeBox(new QComboBox(this)) {
    setObjectName("ExplorerToolbar");

    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(10, 4, 10, 4);
    layout->setSpacing(6);

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

    m_viewModeBox->setObjectName("ToolbarCombo");
    m_viewModeBox->addItem("Details", 0);
    m_viewModeBox->addItem("List", 1);
    m_viewModeBox->setFixedWidth(96);
    m_viewModeBox->setToolTip("Change view");
    layout->addWidget(m_viewModeBox);

    m_searchField->setObjectName("SearchField");
    m_searchField->setPlaceholderText("Search this folder with Ixos");
    m_searchField->setClearButtonEnabled(true);
    m_searchField->setFixedWidth(260);
    layout->addWidget(m_searchField);

    connect(m_backBtn, &QPushButton::clicked, this, &ExplorerToolbar::backRequested);
    connect(m_fwdBtn, &QPushButton::clicked, this, &ExplorerToolbar::forwardRequested);
    connect(m_upBtn, &QPushButton::clicked, this, &ExplorerToolbar::upRequested);
    connect(m_refreshBtn, &QPushButton::clicked, this, &ExplorerToolbar::refreshRequested);
    connect(m_breadcrumb, &BreadcrumbBar::navigateRequested, this, &ExplorerToolbar::navigateRequested);
    connect(m_searchField, &QLineEdit::returnPressed, this, [this]() {
        emit searchRequested(m_searchField->text());
    });
    connect(m_viewModeBox, &QComboBox::currentIndexChanged, this, [this](int index) {
        emit viewModeChanged(m_viewModeBox->itemData(index).toInt());
    });

    setNavigationState(false, false, false);
}

void ExplorerToolbar::setCurrentPath(const QString &path) {
    m_breadcrumb->setPath(path);
}

void ExplorerToolbar::setNavigationState(bool canGoBack, bool canGoForward, bool canGoUp) {
    m_backBtn->setEnabled(canGoBack);
    m_fwdBtn->setEnabled(canGoForward);
    m_upBtn->setEnabled(canGoUp);
}

void ExplorerToolbar::setViewMode(int mode) {
    const int index = m_viewModeBox->findData(mode);
    if (index >= 0 && index != m_viewModeBox->currentIndex()) {
        const bool blocked = m_viewModeBox->blockSignals(true);
        m_viewModeBox->setCurrentIndex(index);
        m_viewModeBox->blockSignals(blocked);
    }
}

} // namespace Ixplorer
