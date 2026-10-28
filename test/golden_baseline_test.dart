// Generates reference screenshots of the existing Flutter UI on `main`.
//
//   flutter test --update-goldens test/golden_baseline_test.dart
//
// Output lands in test/goldens/ and is uploaded by
// .github/workflows/flutter-baseline.yml, so the Tauri branch's screenshots can
// be compared against the Flutter original page by page.
//
// The theme here mirrors lib/app.dart exactly (Material 3 + colourSchemeSeed +
// MiSans text theme). Pages that need the Isar/Rust runtime are rendered in
// their empty/pre-connect state; `tester.takeException()` absorbs the resulting
// missing-backend exceptions so one page cannot abort the whole run.

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astral/features/home/pages/home_page.dart';
import 'package:astral/features/rooms/pages/room_page.dart';
import 'package:astral/features/tools/pages/tools_page.dart';
import 'package:astral/features/servers/pages/server_page.dart';
import 'package:astral/features/settings/pages/settings_main_page.dart';

Future<void> loadAppFonts() async {
  final loader = FontLoader('MiSans');
  for (final path in ['fonts/MiSans-Regular.ttf', 'fonts/MiSans-Demibold.ttf']) {
    final file = File(path);
    if (file.existsSync()) {
      loader.addFont(Future.value(ByteData.sublistView(file.readAsBytesSync())));
    }
  }
  await loader.load();
}

/// Mirrors the ThemeData built in lib/app.dart.
ThemeData appTheme() {
  return ThemeData(
    useMaterial3: true,
    colorSchemeSeed: Colors.blue,
    brightness: Brightness.light,
  ).copyWith(
    textTheme: Typography.material2021().black.apply(fontFamily: 'MiSans'),
    primaryTextTheme: Typography.material2021().black.apply(fontFamily: 'MiSans'),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const surfaceSize = Size(1280, 800);

  setUpAll(() async {
    await loadAppFonts();
  });

  Future<void> pumpPage(WidgetTester tester, Widget page, String name) async {
    await tester.binding.setSurfaceSize(surfaceSize);
    await tester.pumpWidget(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: appTheme(),
        home: Scaffold(body: page),
      ),
    );
    // Swallow missing-backend exceptions (Isar / EasyTier) - the static layout
    // is still what we want to capture.
    tester.takeException();
    await tester.pump(const Duration(milliseconds: 400));
    tester.takeException();

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/$name.png'),
    );
  }

  group('baseline goldens', () {
    testWidgets('01-home', (tester) async {
      await pumpPage(tester, const HomePage(), '01-home');
    });

    testWidgets('02-room', (tester) async {
      await pumpPage(tester, const RoomPage(), '02-room');
    });

    testWidgets('03-tools', (tester) async {
      await pumpPage(tester, const ToolsPage(), '03-tools');
    });

    testWidgets('04-server', (tester) async {
      await pumpPage(tester, const ServersPage(), '04-server');
    });

    testWidgets('05-settings', (tester) async {
      await pumpPage(tester, const SettingsMainPage(), '05-settings');
    });
  });
}
