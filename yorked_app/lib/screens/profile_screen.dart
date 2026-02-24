import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../models/player.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _isEditing = false;
  bool _isSaving = false;
  final _nameController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(authStateProvider);
    final profileAsync = ref.watch(playerProfileProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('PROFILE', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/dashboard'),
        ),
        actions: [
          if (!_isEditing)
            IconButton(
              icon: const Icon(Icons.edit, color: Color(0xFF64B5F6)),
              onPressed: () {
                final profile = profileAsync.value;
                if (profile != null) {
                  _nameController.text = profile.displayName;
                }
                setState(() => _isEditing = true);
              },
            ),
        ],
      ),
      body: userAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF1E88E5))),
        error: (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: Colors.red))),
        data: (user) {
          if (user == null) {
            return const Center(child: Text('Not signed in', style: TextStyle(color: Colors.white54)));
          }

          return profileAsync.when(
            loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF1E88E5))),
            error: (e, _) => Center(child: Text('Error loading profile: $e', style: const TextStyle(color: Colors.red))),
            data: (profile) {
              if (profile == null) {
                // No profile yet — redirect to setup
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted) context.go('/profile/setup');
                });
                return const Center(child: CircularProgressIndicator(color: Color(0xFF1E88E5)));
              }

              return SingleChildScrollView(
                padding: const EdgeInsets.all(32),
                child: Center(
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 600),
                    child: Column(
                      children: [
                        // Avatar & Name
                        CircleAvatar(
                          radius: 50,
                          backgroundColor: const Color(0xFF1E88E5).withOpacity(0.3),
                          backgroundImage: user.photoURL != null ? NetworkImage(user.photoURL!) : null,
                          child: user.photoURL == null
                              ? Text(profile.displayName[0].toUpperCase(),
                                  style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Color(0xFF64B5F6)))
                              : null,
                        ),
                        const SizedBox(height: 16),

                        if (_isEditing) ...[
                          TextField(
                            controller: _nameController,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: const Color(0xFF1E293B),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                              hintText: 'Display Name',
                              hintStyle: const TextStyle(color: Colors.white30),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              ElevatedButton(
                                onPressed: _isSaving ? null : () async {
                                  if (_nameController.text.trim().isEmpty) return;
                                  setState(() => _isSaving = true);
                                  await firestoreService.updateUserProfile(user.uid, {
                                    'displayName': _nameController.text.trim(),
                                  });
                                  ref.invalidate(playerProfileProvider);
                                  setState(() { _isEditing = false; _isSaving = false; });
                                },
                                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E88E5)),
                                child: _isSaving
                                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                    : const Text('SAVE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              ),
                              const SizedBox(width: 12),
                              TextButton(
                                onPressed: () => setState(() => _isEditing = false),
                                child: const Text('CANCEL', style: TextStyle(color: Colors.white54)),
                              ),
                            ],
                          ),
                        ] else ...[
                          Text(profile.displayName,
                            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 1)),
                          const SizedBox(height: 4),
                          Text(user.email ?? '', style: const TextStyle(color: Color(0xFF94A3B8))),
                        ],

                        const SizedBox(height: 32),

                        // Role & Bowling Style
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _chip(profile.role, const Color(0xFF1E88E5)),
                            const SizedBox(width: 12),
                            _chip(profile.bowlingStyle, const Color(0xFFE53935)),
                          ],
                        ),

                        const SizedBox(height: 32),

                        // Attributes
                        Row(
                          children: [
                            Expanded(child: _attrCard('BATTING', [
                              _attrRow('Technique', profile.batting.technique),
                              _attrRow('Power', profile.batting.power),
                              _attrRow('Timing', profile.batting.timing),
                            ], Colors.blueAccent)),
                            const SizedBox(width: 16),
                            Expanded(child: _attrCard('BOWLING', [
                              _attrRow('Accuracy', profile.bowling.accuracy),
                              _attrRow('Pace', profile.bowling.pace),
                              _attrRow('Variation', profile.bowling.variation),
                            ], Colors.redAccent)),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Career Stats
                        _attrCard('CAREER STATS', [
                          _statRow('Matches', profile.careerStats.matches),
                          _statRow('Wins', profile.careerStats.wins),
                          _statRow('Losses', profile.careerStats.losses),
                          _statRow('Runs Scored', profile.careerStats.runsScored),
                          _statRow('Wickets Taken', profile.careerStats.wicketsTaken),
                        ], Colors.amber),

                        const SizedBox(height: 32),

                        // Edit Profile button → goes to full setup
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () => context.go('/profile/setup'),
                            icon: const Icon(Icons.tune, color: Color(0xFF64B5F6)),
                            label: const Text('EDIT FULL PROFILE', style: TextStyle(color: Color(0xFF64B5F6), fontWeight: FontWeight.bold, letterSpacing: 1)),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              side: const BorderSide(color: Color(0xFF1E88E5)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                          ),
                        ),

                        const SizedBox(height: 16),

                        // Sign out
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () async {
                              await authService.signOut();
                              if (context.mounted) context.go('/');
                            },
                            icon: const Icon(Icons.logout, color: Colors.white),
                            label: const Text('SIGN OUT', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.5, color: Colors.white)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFE53935),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _chip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, letterSpacing: 1)),
    );
  }

  Widget _attrCard(String title, List<Widget> children, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border(top: BorderSide(color: color, width: 3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold, letterSpacing: 2, fontSize: 12)),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _attrRow(String label, int value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70)),
          Row(
            children: List.generate(7, (i) => Container(
              width: 10, height: 10,
              margin: const EdgeInsets.only(left: 3),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: i < value ? Colors.white : Colors.white12,
              ),
            )),
          ),
        ],
      ),
    );
  }

  Widget _statRow(String label, int value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70)),
          Text(value.toString(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        ],
      ),
    );
  }
}
