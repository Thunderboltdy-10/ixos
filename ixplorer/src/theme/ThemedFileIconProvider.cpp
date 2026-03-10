#include "theme/ThemedFileIconProvider.h"

namespace Ixplorer {

ThemedFileIconProvider::ThemedFileIconProvider() = default;

QIcon ThemedFileIconProvider::icon(IconType type) const {
    return QFileIconProvider::icon(type);
}

QIcon ThemedFileIconProvider::icon(const QFileInfo &info) const {
    return QFileIconProvider::icon(info);
}

}
