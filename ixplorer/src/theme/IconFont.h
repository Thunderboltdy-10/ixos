#pragma once

#include <QFont>
#include <QString>
#include <QChar>
#include <QIcon>
#include <QColor>

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
inline const QChar Star(0xE734);
inline const QChar History(0xE81C);
inline const QChar Device(0xE88E);
inline const QChar Document(0xE8A5);
inline const QChar Download(0xE8D5);

// New icons for redesign
inline const QChar Settings(0xE713);
inline const QChar Filter(0xE71C);
inline const QChar Delete(0xE74D);
inline const QChar Rename(0xE8AC);
inline const QChar Copy(0xE8C8);
inline const QChar Paste(0xE77F);
inline const QChar Cut(0xE8C6);
inline const QChar NewFolder(0xEDCE); // Or 0xE8F4
inline const QChar Play(0xE768);
inline const QChar Pause(0xE769);
inline const QChar PDF(0xEA90);
inline const QChar Video(0xE714);
inline const QChar Checkmark(0xE73E);
inline const QChar Warning(0xE7BA);
inline const QChar Error(0xEA39);
inline const QChar Info(0xE946);
inline const QChar ChevronUp(0xE70E);
inline const QChar ChevronLeft(0xE76B);

// Factory function to get the configured icon font with specific size
QFont iconFont(int pixelSize = 16);

// Factory functions to create QIcons from font glyphs
QIcon makeIconFromFont(QChar codepoint, int size);
QIcon makeIconFromFont(QChar codepoint, int size, QColor color);
QIcon makeIconFromFont(QChar codepoint, int size, QColor normalColor, QColor disabledColor);

} // namespace Ixplorer::Icons
