#include "widgets/ExplorerToolbar.h"
#include "widgets/BreadcrumbBar.h"

#include <QHBoxLayout>
#include <QPixmap>
#include <QSizePolicy>
#include <QStyle>

namespace Ixplorer {

ExplorerToolbar::ExplorerToolbar(QWidget *parent)
    : QWidget(parent)
    , m_navGroup(new QFrame(this))
    , m_backBtn(new QPushButton(this))
    , m_fwdBtn(new QPushButton(this))
    , m_upBtn(new QPushButton(this))
    , m_refreshBtn(new QPushButton(this))
    , m_breadcrumb(new BreadcrumbBar(this))
    , m_searchModeBox(new QComboBox(this))
    , m_searchField(new QLineEdit(this))
    , m_searchButton(new QPushButton(this))
    , m_paletteButton(new QPushButton(this))
    , m_viewModeBox(new QComboBox(this))
    , m_toggleRailBtn(new QPushButton(this)) {
    setObjectName("ExplorerToolbar");

    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(12, 8, 12, 8);
    layout->setSpacing(8);

    m_navGroup->setObjectName("ToolbarNavGroup");
    auto *navLayout = new QHBoxLayout(m_navGroup);
    navLayout->setContentsMargins(0, 0, 0, 0);
    navLayout->setSpacing(0);

    m_backBtn->setIcon(style()->standardIcon(QStyle::SP_ArrowBack));
    m_fwdBtn->setIcon(style()->standardIcon(QStyle::SP_ArrowForward));
    m_upBtn->setIcon(style()->standardIcon(QStyle::SP_ArrowUp));
    m_refreshBtn->setIcon(style()->standardIcon(QStyle::SP_BrowserReload));

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

    layout->addWidget(m_breadcrumb, 1);
    layout->addSpacing(8);

    m_searchModeBox->setObjectName("ToolbarCombo");
    m_searchModeBox->addItem("Auto", 1);
    m_searchModeBox->addItem("Fast", 0);
    m_searchModeBox->addItem("Accurate", 2);
    m_searchModeBox->setFixedWidth(92);
    m_searchModeBox->setToolTip("Ixos search mode");
    layout->addWidget(m_searchModeBox);

    // Search Icon rendering
    m_searchField->addAction(style()->standardIcon(QStyle::SP_FileDialogContentsView), QLineEdit::LeadingPosition);

    m_searchField->setObjectName("SearchField");
    m_searchField->setPlaceholderText("Search this folder with Ixos");
    m_searchField->setClearButtonEnabled(true);
    m_searchField->setMinimumWidth(360);
    m_searchField->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
    layout->addWidget(m_searchField, 1);

    m_searchButton->setObjectName("ToolbarPrimaryButton");
    m_searchButton->setIcon(style()->standardIcon(QStyle::SP_ArrowForward));
    m_searchButton->setFixedWidth(38);
    m_searchButton->setToolTip("Run Ixos search in the current folder");
    layout->addWidget(m_searchButton);

    m_paletteButton->setObjectName("ToolbarGhostButton");
    m_paletteButton->setIcon(style()->standardIcon(QStyle::SP_TitleBarMenuButton));
    m_paletteButton->setFixedWidth(38);
    m_paletteButton->setToolTip("Open command palette");
    layout->addWidget(m_paletteButton);
    layout->addSpacing(8);

    m_viewModeBox->setObjectName("ToolbarCombo");
    m_viewModeBox->addItem("Details", 0);
    m_viewModeBox->addItem("List", 1);
    m_viewModeBox->setFixedWidth(90);
    m_viewModeBox->setToolTip("Change view");
    layout->addWidget(m_viewModeBox);

    m_toggleRailBtn->setObjectName("ToolbarRailButton");
    m_toggleRailBtn->setCheckable(true);
    m_toggleRailBtn->setIcon(style()->standardIcon(QStyle::SP_FileDialogDetailedView));
    m_toggleRailBtn->setFixedWidth(38);
    m_toggleRailBtn->setToolTip("Show or hide the Ixos rail");
    layout->addWidget(m_toggleRailBtn);

    connect(m_backBtn, &QPushButton::clicked, this, &ExplorerToolbar::backRequested);
    connect(m_fwdBtn, &QPushButton::clicked, this, &ExplorerToolbar::forwardRequested);
    connect(m_upBtn, &QPushButton::clicked, this, &ExplorerToolbar::upRequested);
    connect(m_refreshBtn, &QPushButton::clicked, this, &ExplorerToolbar::refreshRequested);
    connect(m_breadcrumb, &BreadcrumbBar::navigateRequested, this, &ExplorerToolbar::navigateRequested);
    connect(m_searchField, &QLineEdit::returnPressed, this, [this]() {
        emit searchRequested(m_searchField->text().trimmed(), m_searchModeBox->currentData().toInt());
    });
    connect(m_searchField, &QLineEdit::textChanged, this, [this]() {
        emitSearchDraft();
    });
    connect(m_searchButton, &QPushButton::clicked, this, [this]() {
        emit searchRequested(m_searchField->text().trimmed(), m_searchModeBox->currentData().toInt());
    });
    connect(m_paletteButton, &QPushButton::clicked, this, &ExplorerToolbar::commandPaletteRequested);
    connect(m_searchModeBox, &QComboBox::currentIndexChanged, this, [this](int index) {
        const int mode = m_searchModeBox->itemData(index).toInt();
        emit searchDraftChanged(m_searchField->text().trimmed(), mode);
    });
    connect(m_viewModeBox, &QComboBox::currentIndexChanged, this, [this](int index) {
        emit viewModeChanged(m_viewModeBox->itemData(index).toInt());
    });
    connect(m_toggleRailBtn, &QPushButton::clicked, this, &ExplorerToolbar::toggleRailRequested);

    setNavigationState(false, false, false);
    setRailVisible(false);
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

void ExplorerToolbar::setViewModeEnabled(bool enabled) {
    m_viewModeBox->setEnabled(enabled);
    m_viewModeBox->setVisible(enabled);
}

void ExplorerToolbar::setWorkspaceMode(bool browsingWorkspace) {
    m_viewModeBox->setVisible(browsingWorkspace);
    m_searchModeBox->setVisible(true);
    m_searchButton->setVisible(true);
    m_searchField->setPlaceholderText(browsingWorkspace
                                          ? QStringLiteral("Search this folder with Ixos")
                                          : QStringLiteral("Search around this file with Ixos"));
    m_refreshBtn->setToolTip(browsingWorkspace ? QStringLiteral("Refresh (F5)")
                                               : QStringLiteral("Reload hosted app (F5)"));
}

void ExplorerToolbar::setSearchText(const QString &query) {
    if (m_searchField->text() == query) {
        return;
    }
    const bool blocked = m_searchField->blockSignals(true);
    m_searchField->setText(query);
    m_searchField->blockSignals(blocked);
}

void ExplorerToolbar::setSearchMode(int mode) {
    const int index = m_searchModeBox->findData(mode);
    if (index >= 0 && index != m_searchModeBox->currentIndex()) {
        const bool blocked = m_searchModeBox->blockSignals(true);
        m_searchModeBox->setCurrentIndex(index);
        m_searchModeBox->blockSignals(blocked);
    }
}

void ExplorerToolbar::setRailVisible(bool visible) {
    m_toggleRailBtn->setChecked(visible);
}

void ExplorerToolbar::focusSearch() {
    m_searchField->setFocus();
    m_searchField->selectAll();
}

void ExplorerToolbar::emitSearchDraft() {
    emit searchDraftChanged(m_searchField->text().trimmed(), m_searchModeBox->currentData().toInt());
}

} // namespace Ixplorer
