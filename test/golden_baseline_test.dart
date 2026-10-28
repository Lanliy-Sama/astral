// Generates reference screenshots of the existing Flutter UI on `main`.
//
// Run with:
//   flutter test --update-goldens test/golden_baseline_test.dart
//
// Output lands in test/goldens/ and is uploaded by
// .github/workflows/flutter-baseline.yml, so the Tauri branch's screenshots can
// be diffed against the Flutter original page by page.
//
// Each tab is rendered in isolation to keep the goldens stable: the real app
// needs Isar + the EasyTier runtime, none of which affect the static layout.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astral/features/home/pages/home_page.dart';
import 'package:astral/features/rooms/pages/room_page.dart';
import 'package:astral/features/tools/pages/tools_page.dart';
import 'package:astral/features/servers/pages/server_page.dart';
import 'package:astral/features/settings/pages/settings_main_page.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const surfaceSize = Size(1280, 800);

  Future<void> pumpPage(
    WidgetTester tester,
    Widget page,
    String name,
  ) async {
    await tester.binding.setSurfaceSize(surfaceSize);
    await tester.pumpWidget(
      MaterialApp(
        useInheritedMediaQuery: true,
        theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.blue),
        home: MediaQuery(
          data: const MediaQueryData(size: surfaceSize),
          child: Scaffold(body: page),
        ),
      ),
    );
    await tester.pumpAndSettle();

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
