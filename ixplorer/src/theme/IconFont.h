#pragma once

#include <QFont>
#include <QString>
#include <QChar>

namespace Ixplorer::Icons {

// Unicode codepoints for Segoe Fluent Icons / Segoe MDL2 Assets
inline const QChar Home(0xE80F);
inline const QChar Folder(0xE8B7);
inline const QChar Search(0xE721);
inline const QChar ChevronDown(0xE70D);
inline const QChar ChevronRight(0xE76C);
inline const QChar Back(0xE72B);
inline const QChar Forward(0xE72A);
inline const QChar Up(0xE74A);
inline const QChar Refresh(0xE72C);
inline const QChar Close(0xE711);
inline const QChar Add(0xE710);
inline const QChar Pin(0xE718);
inline const QChar Desktop(0xE83C);
inline const QChar Documents(0xE8A5);
inline const QChar Downloads(0xE8D5);
inline const QChar Pictures(0xE8B9);
inline const QChar Music(0xE8D6);
inline const QChar Videos(0xE8B2);
inline const QChar Clock(0xE823);
inline const QChar Drive(0xE88E);
inline const QChar Computer(0xE80A);
inline const QChar Code(0xE943);
inline const QChar Image(0xE8B9);
inline const QChar Archive(0xE7B8);
inline const QChar Executable(0xE7EF);

// Factory function to get the configured icon font with specific size
QFont iconFont(int pixelSize = 16);

} // namespace Ixplorer::Icons
