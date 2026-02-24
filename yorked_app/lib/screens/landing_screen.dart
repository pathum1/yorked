import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:animate_do/animate_do.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import '../providers/auth_provider.dart';

class LandingScreen extends ConsumerWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {

    ref.listen(authStateProvider, (previous, next) async {
       if (next.value != null) {
          // User is authenticated
          final profile = await ref.read(playerProfileProvider.future);
          if (profile == null) {
             if (context.mounted) context.go('/profile/setup');
          } else {
             if (context.mounted) context.go('/dashboard');
          }
       }
    });

    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1C),
      body: Stack(
        children: [
          // Background atmospheric glow
          Positioned(
            top: -100,
            right: -100,
            child: FadeIn(
              duration: const Duration(seconds: 3),
              child: Container(
                width: 400,
                height: 400,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF1E88E5).withOpacity(0.3),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -150,
            left: -100,
            child: FadeInUp(
              duration: const Duration(seconds: 3),
              child: Container(
                width: 500,
                height: 500,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFFE53935).withOpacity(0.2),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Main content
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  FadeInDown(
                    duration: const Duration(milliseconds: 1200),
                    child: const FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        'YORKED',
                        style: TextStyle(
                          fontFamily: 'Outfit',
                          fontSize: 84,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 12,
                          color: Colors.white,
                          shadows: [
                            Shadow(
                              blurRadius: 20.0,
                              color: Color(0xFF1E88E5),
                              offset: Offset(0, 0),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  FadeInLeft(
                    delay: const Duration(milliseconds: 600),
                    duration: const Duration(milliseconds: 1000),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: const Text(
                        'ASYNC MULTIPLAYER CRICKET',
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          letterSpacing: 4,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 80),

                  // Call to Action
                  FadeInUp(
                    delay: const Duration(milliseconds: 1200),
                    duration: const Duration(milliseconds: 1000),
                    child: MouseRegion(
                      cursor: SystemMouseCursors.click,
                      child: GestureDetector(
                        onTap: () async {
                           final authService = ref.read(authServiceProvider);
                           await authService.signInWithGoogle();
                        },
                        child: Container(
                          width: 300,
                          height: 60,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF1E88E5), Color(0xFF1565C0)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(30),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF1E88E5).withOpacity(0.4),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              )
                            ],
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.login, color: Colors.white),
                              SizedBox(width: 12),
                              Text(
                                'CONTINUE WITH GOOGLE',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  letterSpacing: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),
                  FadeIn(
                    delay: const Duration(milliseconds: 1800),
                    child: const Text(
                      'Invite friends • asynchronous play • detailed stats',
                      style: TextStyle(color: Colors.white54, fontSize: 13),
                    ),
                  )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
