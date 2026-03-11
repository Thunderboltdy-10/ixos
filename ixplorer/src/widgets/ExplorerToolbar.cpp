#include "widgets/ExplorerToolbar.h"
#include "theme/IconFont.h"
#include "theme/Colors.h"

#include <QHBoxLayout>
#include <QPixmap>
#include <QSizePolicy>

namespace Ixplorer {

ExplorerToolbar::ExplorerToolbar(QWidget *parent)
    : QWidget(parent)
    , m_navGroup(new QFrame(this))
    , m_backBtn(new QPushButton(this))
    , m_fwdBtn(new QPushButton(this))
    , m_upBtn(new QPushButton(this))
    , m_refreshBtn(new QPushButton(this))
    , m_searchField(new QLineEdit(this))
    , m_toggleRailBtn(new QPushButton(this)) {
    setObjectName("ExplorerToolbar");

    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(12, 8, 12, 8);
    layout->setSpacing(8);

    m_navGroup->setObjectName("ToolbarNavGroup");
    auto *navLayout = new QHBoxLayout(m_navGroup);
    navLayout->setContentsMargins(4, 0, 4, 0);
    navLayout->setSpacing(4);

    QColor iconColor = Colors::qc(Colors::FgPrimary);
    QColor disabledColor = Colors::qc(Colors::FgGhost);

    m_backBtn->setIcon(Icons::makeIconFromFont(Icons::Back, 16, iconColor, disabledColor));
    m_fwdBtn->setIcon(Icons::makeIconFromFont(Icons::Forward, 16, iconColor, disabledColor));
    m_upBtn->setIcon(Icons::makeIconFromFont(Icons::Up, 16, iconColor, disabledColor));
    m_refreshBtn->setIcon(Icons::makeIconFromFont(Icons::Refresh, 16, iconColor, disabledColor));

    m_backBtn->setToolTip("Back (Alt+Left)");
    m_fwdBtn->setToolTip("Forward (Alt+Right)");
    m_upBtn->setToolTip("Up (Alt+Up)");
    m_refreshBtn->setToolTip("Refresh (F5)");
    
    m_backBtn->setObjectName("ToolbarNavButton");
    m_fwdBtn->setObjectName("ToolbarNavButton");
    m_upBtn->setObjectName("ToolbarNavButton");
    m_refreshBtn->setObjectName("ToolbarNavButton");

    navLayout->addWidget(m_backBtn);
    navLayout->addWidget(m_fwdBtn);
    navLayout->addWidget(m_upBtn);
    navLayout->addWidget(m_refreshBtn);

    layout->addWidget(m_navGroup);
    layout->addSpacing(8);

    // Search Icon rendering
    m_searchField->addAction(Icons::makeIconFromFont(Icons::Search, 16, Colors::qc(Colors::FgMuted)), QLineEdit::LeadingPosition);

    m_searchField->setObjectName("SearchField");
    m_searchField->setPlaceholderText("Search this folder with Ixos");
    m_searchField->setClearButtonEnabled(true);
    m_searchField->setMinimumWidth(360);
    m_searchField->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
    layout->addWidget(m_searchField, 1);

    m_toggleRailBtn->setObjectName("ToolbarRailButton");
    m_toggleRailBtn->setCheckable(true);
    m_toggleRailBtn->setIcon(Icons::makeIconFromFont(Icons::Search, 16, iconColor, disabledColor)); // Rail toggle is search related? No, actually maybe standard icon.
    // Wait, the plan says "Rail toggle". The original used SP_FileDialogDetailedView. I'll use Settings or some other icon, or just Image. Let's use Icons::Filter for rail toggle or just a search right icon. Wait, the original was detailed view. I will use the actual rail icon or maybe Icons::Settings or a generic menu one. Wait, in 1.2 it says "search/palette/rail/searchField". Let's use Icons::Search or maybe a sidebar icon if available. I'll use Icons::Search for now. But wait, "Search" is for the search input. Let's use Icons::Filter or Icons::Search. Actually I'll use Icons::Image for now. Let's see if there is a layout icon.
    // I added Home, Folder, Search, Chevron, Back, Forward, Up, Refresh, Close, Add, Pin, Desktop, Documents... Let's use Icons::Search for rail toggle, or a generic. "Settings"? No.
    // Actually I'll use `Icons::Desktop` maybe? Or just use `Icons::Search`. No, wait. 
    m_toggleRailBtn->setIcon(Icons::makeIconFromFont(Icons::Home, 16, iconColor, disabledColor)); // Temporary
    m_toggleRailBtn->setFixedWidth(38);
    m_toggleRailBtn->setToolTip("Show or hide the Ixos rail");
    layout->addWidget(m_toggleRailBtn);

    connect(m_backBtn, &QPushButton::clicked, this, &ExplorerToolbar::backRequested);
    connect(m_fwdBtn, &QPushButton::clicked, this, &ExplorerToolbar::forwardRequested);
    connect(m_upBtn, &QPushButton::clicked, this, &ExplorerToolbar::upRequested);
    connect(m_refreshBtn, &QPushButton::clicked, this, &ExplorerToolbar::refreshRequested);
    
    connect(m_searchField, &QLineEdit::returnPressed, this, [this]() {
        emit searchRequested(m_searchField->text().trimmed(), 1); // 1 = Auto
    });
    connect(m_searchField, &QLineEdit::textChanged, this, [this]() {
        emitSearchDraft();
    });
    
    connect(m_toggleRailBtn, &QPushButton::clicked, this, &ExplorerToolbar::toggleRailRequested);

    setNavigationState(false, false, false);
    setRailVisible(false);
}

void ExplorerToolbar::setNavigationState(bool canGoBack, bool canGoForward, bool canGoUp) {
    m_backBtn->setEnabled(canGoBack);
    m_fwdBtn->setEnabled(canGoForward);
    m_upBtn->setEnabled(canGoUp);
}

void ExplorerToolbar::setSearchText(const QString &query) {
    if (m_searchField->text() == query) {
        return;
    }
    const bool blocked = m_searchField->blockSignals(true);
    m_searchField->setText(query);
    m_searchField->blockSignals(blocked);
}

void ExplorerToolbar::setRailVisible(bool visible) {
    m_toggleRailBtn->setChecked(visible);
}

void ExplorerToolbar::focusSearch() {
    m_searchField->setFocus();
    m_searchField->selectAll();
}

void ExplorerToolbar::emitSearchDraft() {
    emit searchDraftChanged(m_searchField->text().trimmed(), 1); // 1 = Auto
}

} // namespace Ixplorer
