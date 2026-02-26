import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:animate_do/animate_do.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import '../providers/auth_provider.dart';

class LandingScreen extends ConsumerStatefulWidget {
  const LandingScreen({super.key});

  @override
  ConsumerState<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends ConsumerState<LandingScreen> {
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {

    ref.listen(authStateProvider, (previous, next) async {
       if (next.value != null) {
          // User is authenticated
          try {
            final profile = await ref.read(playerProfileProvider.future);
            if (!mounted) return;
            
            final uri = GoRouterState.of(context).uri;
            final redirect = uri.queryParameters['redirect'];

            if (profile == null) {
               context.go('/profile/setup', extra: redirect);
            } else {
               if (redirect != null && redirect.isNotEmpty) {
                 context.go(redirect);
               } else {
                 context.go('/dashboard');
               }
            }
          } catch (e) {
            if (mounted) {
              setState(() => _isLoading = false);
            }
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
                           if (_isLoading) return;
                           setState(() => _isLoading = true);
                           final authService = ref.read(authServiceProvider);
                           final userCredential = await authService.signInWithGoogle();
                           if (userCredential == null && mounted) {
                              setState(() => _isLoading = false);
                           }
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
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: _isLoading
                                ? const [
                                    SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                        strokeWidth: 2.5,
                                      ),
                                    ),
                                    SizedBox(width: 12),
                                    Text(
                                      'LOGGING IN...',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                        letterSpacing: 1.5,
                                      ),
                                    ),
                                  ]
                                : const [
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
