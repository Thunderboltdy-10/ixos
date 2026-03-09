#include "widgets/BreadcrumbBar.h"

#include <QDir>
#include <QLabel>
#include <QPushButton>

namespace Ixplorer {

BreadcrumbBar::BreadcrumbBar(QWidget *parent)
    : QWidget(parent)
    , m_layout(new QHBoxLayout(this)) {
    setObjectName("BreadcrumbBar");
    m_layout->setContentsMargins(0, 0, 0, 0);
    m_layout->setSpacing(0);
    m_layout->addStretch();
}

void BreadcrumbBar::setPath(const QString &path) {
    QString normalized = QDir::toNativeSeparators(path);
    if (normalized == m_path)
        return;
    m_path = normalized;
    rebuild();
}

void BreadcrumbBar::rebuild() {
    // Clear existing widgets
    while (m_layout->count() > 0) {
        auto *item = m_layout->takeAt(0);
        if (item->widget())
            item->widget()->deleteLater();
        delete item;
    }

    if (m_path.isEmpty()) {
        m_layout->addStretch();
        return;
    }

    // Split path into segments
    QString normalized = QDir::fromNativeSeparators(m_path);
    QStringList parts;
    QString accumulated;

#ifdef Q_OS_WIN
    // Handle drive root like "C:/"
    if (normalized.length() >= 2 && normalized[1] == ':') {
        QString drive = normalized.left(3); // "C:/"
        parts << drive;
        normalized = normalized.mid(3);
    }
#else
    if (normalized.startsWith('/')) {
        parts << "/";
        normalized = normalized.mid(1);
    }
#endif

    QStringList segments = normalized.split('/', Qt::SkipEmptyParts);
    parts.append(segments);

    // Build clickable buttons for all but last, label for last
    QString runningPath;
    for (int i = 0; i < parts.size(); ++i) {
        if (i == 0) {
            runningPath = parts[0];
#ifdef Q_OS_WIN
            if (!runningPath.endsWith('/'))
                runningPath += '/';
#endif
        } else {
            if (!runningPath.endsWith('/'))
                runningPath += '/';
            runningPath += parts[i];
        }

        if (i > 0) {
            auto *sep = new QLabel(QStringLiteral(" > "), this);
            m_layout->addWidget(sep);
        }

        bool isLast = (i == parts.size() - 1);
        if (isLast) {
            auto *label = new QLabel(parts[i], this);
            label->setObjectName("BreadcrumbCurrent");
            m_layout->addWidget(label);
        } else {
            auto *btn = new QPushButton(parts[i], this);
            btn->setCursor(Qt::PointingHandCursor);
            btn->setSizePolicy(QSizePolicy::Maximum, QSizePolicy::Preferred);
            QString targetPath = runningPath;
            connect(btn, &QPushButton::clicked, this, [this, targetPath]() {
                emit navigateRequested(targetPath);
            });
            m_layout->addWidget(btn);
        }
    }

    m_layout->addStretch();
}

} // namespace Ixplorer
