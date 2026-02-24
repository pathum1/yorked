import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import '../firebase_options.dart';
import 'screens/screens.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  usePathUrlStrategy(); // Use clean URLs without '#' for deep linking
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  runApp(
    const ProviderScope(
      child: YorkedApp(),
    ),
  );
}

class YorkedApp extends ConsumerWidget {
  const YorkedApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Yorked',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1E88E5), // Blue accent
          brightness: Brightness.dark,       // A bold dark mode aesthetic
          background: const Color(0xFF0F172A),
        ),
        useMaterial3: true,
        fontFamily: 'Outfit', // Distinctive font as per aesthetic rules
      ),
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}

// Basic GoRouter setup
final _router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const LandingScreen(),
    ),
    GoRoute(
      path: '/profile/setup',
      builder: (context, state) {
        final redirectUrl = state.extra as String?;
        return ProfileSetupScreen(redirectUrl: redirectUrl);
      },
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => const DashboardScreen(),
    ),
    GoRoute(
      path: '/match/create',
      builder: (context, state) => const CreateMatchScreen(),
    ),
    GoRoute(
      path: '/match/:id/lobby',
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>?;
        final isNew = extra?['isNew'] == true;
        return LobbyScreen(matchId: state.pathParameters['id']!, isNew: isNew);
      },
    ),
    GoRoute(
      path: '/match/:id/toss',
      builder: (context, state) => TossScreen(matchId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/match/:id/intro',
      builder: (context, state) => IntroSplashScreen(matchId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/match/:id/live',
      builder: (context, state) => MatchLiveScreen(matchId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/match/:id/bowl',
      builder: (context, state) => BowlingScreen(matchId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/match/:id/bat',
      builder: (context, state) => BattingScreen(matchId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/match/:id/break',
      builder: (context, state) => InningsBreakScreen(matchId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/match/:id/victory',
      builder: (context, state) => VictoryScreen(matchId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const ProfileScreen(),
    ),
    GoRoute(
      path: '/history',
      builder: (context, state) => const HistoryScreen(),
    ),
  ],
);
