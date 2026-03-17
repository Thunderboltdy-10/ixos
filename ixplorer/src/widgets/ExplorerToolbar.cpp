#include "widgets/ExplorerToolbar.h"
#include "widgets/BreadcrumbBar.h"
#include "theme/IconFont.h"
#include "theme/Colors.h"

#include <QHBoxLayout>
#include <QPixmap>
#include <QSizePolicy>
#include <QToolButton>
#include <QVBoxLayout>

namespace Ixplorer {

ExplorerToolbar::ExplorerToolbar(QWidget *parent)
    : QWidget(parent)
    , m_backBtn(new QPushButton(this))
    , m_fwdBtn(new QPushButton(this))
    , m_upBtn(new QPushButton(this))
    , m_refreshBtn(new QPushButton(this))
    , m_breadcrumb(new BreadcrumbBar(this))
    , m_searchField(new QLineEdit(this))
    , m_toggleRailBtn(new QPushButton(this)) {
    setObjectName("ExplorerToolbar");

    QColor iconColor(0x8B, 0x8B, 0x90);
    QColor disabledColor(0x3A, 0x3A, 0x3E);

    auto *mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    mainLayout->setSpacing(0);

    // Nav Row (Back, Forward, Up, Refresh + Breadcrumb + Search)
    auto *navRow = new QWidget(this);
    navRow->setObjectName("NavRow");
    auto *navLayout = new QHBoxLayout(navRow);
    navLayout->setContentsMargins(12, 4, 12, 4);
    navLayout->setSpacing(4);

    m_backBtn->setIcon(Icons::makeIconFromFont(Icons::Back, 14, iconColor, disabledColor));
    m_fwdBtn->setIcon(Icons::makeIconFromFont(Icons::Forward, 14, iconColor, disabledColor));
    m_upBtn->setIcon(Icons::makeIconFromFont(Icons::Up, 14, iconColor, disabledColor));
    m_refreshBtn->setIcon(Icons::makeIconFromFont(Icons::Refresh, 14, iconColor, disabledColor));

    m_backBtn->setObjectName("ToolbarNavButton");
    m_fwdBtn->setObjectName("ToolbarNavButton");
    m_upBtn->setObjectName("ToolbarNavButton");
    m_refreshBtn->setObjectName("ToolbarNavButton");

    const QList<QPushButton *> navButtons = {m_backBtn, m_fwdBtn, m_upBtn, m_refreshBtn};
    for (QPushButton *button : navButtons) {
        button->setFixedSize(32, 32);
        navLayout->addWidget(button);
    }
    navLayout->addSpacing(8);

    m_breadcrumb->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
    navLayout->addWidget(m_breadcrumb, 2);

    navLayout->addSpacing(12);

    m_searchField->addAction(Icons::makeIconFromFont(Icons::Search, 14, QColor(0x8B, 0x8B, 0x90)), QLineEdit::LeadingPosition);
    m_searchField->setObjectName("SearchField");
    m_searchField->setPlaceholderText("Search");
    m_searchField->setClearButtonEnabled(true);
    m_searchField->setMinimumWidth(200);
    m_searchField->setMaximumWidth(320);
    navLayout->addWidget(m_searchField, 1);

    navLayout->addSpacing(4);

    m_toggleRailBtn->setObjectName("StatusRailToggle");
    m_toggleRailBtn->setCheckable(true);
    m_toggleRailBtn->setFixedSize(32, 32);
    m_toggleRailBtn->setToolTip("Details Pane");
    m_toggleRailBtn->setCursor(Qt::PointingHandCursor);
    m_toggleRailBtn->setIcon(Icons::makeIconFromFont(Icons::Sidebar, 14, iconColor));
    navLayout->addWidget(m_toggleRailBtn);

    mainLayout->addWidget(navRow);

    connect(m_backBtn, &QPushButton::clicked, this, &ExplorerToolbar::backRequested);
    connect(m_fwdBtn, &QPushButton::clicked, this, &ExplorerToolbar::forwardRequested);
    connect(m_upBtn, &QPushButton::clicked, this, &ExplorerToolbar::upRequested);
    connect(m_refreshBtn, &QPushButton::clicked, this, &ExplorerToolbar::refreshRequested);
    
    connect(m_searchField, &QLineEdit::returnPressed, this, [this]() {
        emit searchRequested(m_searchField->text().trimmed(), 1);
    });
    connect(m_searchField, &QLineEdit::textChanged, this, [this]() {
        emitSearchDraft();
    });
    
    connect(m_breadcrumb, &BreadcrumbBar::navigateRequested, this, &ExplorerToolbar::navigateRequested);
    connect(m_toggleRailBtn, &QPushButton::clicked, this, &ExplorerToolbar::toggleRailRequested);

    setNavigationState(false, false, false);
}

void ExplorerToolbar::setNavigationState(bool canGoBack, bool canGoForward, bool canGoUp) {
    m_backBtn->setEnabled(canGoBack);
    m_fwdBtn->setEnabled(canGoForward);
    m_upBtn->setEnabled(canGoUp);
}

void ExplorerToolbar::setSearchText(const QString &query) {
    m_searchField->setText(query);
}

void ExplorerToolbar::setRailVisible(bool visible) {
    m_toggleRailBtn->setChecked(visible);
    QColor color = visible ? QColor(0xFF, 0xFF, 0xFF) : QColor(0x8B, 0x8B, 0x90);
    m_toggleRailBtn->setIcon(Icons::makeIconFromFont(Icons::Sidebar, 14, color));
}

void ExplorerToolbar::focusSearch() {
    m_searchField->setFocus();
    m_searchField->selectAll();
}

void ExplorerToolbar::emitSearchDraft() {
    emit searchDraftChanged(m_searchField->text().trimmed(), 1); // 1 = Auto
}

} // namespace Ixplorer
