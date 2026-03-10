#pragma once
#include <QFileIconProvider>
#include <QIcon>

namespace Ixplorer {
class ThemedFileIconProvider : public QFileIconProvider {
public:
    ThemedFileIconProvider();
    QIcon icon(const QFileInfo &info) const override;
    QIcon icon(IconType type) const override;
};
}
