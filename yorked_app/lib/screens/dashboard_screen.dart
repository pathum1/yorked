import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:animate_do/animate_do.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../providers/match_provider.dart';
import '../models/match_state.dart';
import '../services/api_service.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final matchesAsync = user != null ? ref.watch(activeMatchesProvider(user.uid)) : const AsyncValue.loading();

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'DASHBOARD',
          style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: CircleAvatar(
              backgroundColor: const Color(0xFF1E88E5).withOpacity(0.2),
              child: IconButton(
                icon: const Icon(Icons.person, color: Color(0xFF64B5F6)),
                onPressed: () => context.go('/profile'),
              ),
            ),
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            FadeInDown(
              child: const Text(
                'ACTIVE MATCHES',
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
            ),
            const SizedBox(height: 16),
            matchesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF1E88E5))),
              error: (err, stack) => SelectableText(
                'Firestore Error (Copy this link to create index):\n\n$err',
                style: const TextStyle(color: Colors.redAccent, fontSize: 13),
              ),
              data: (matches) {
                if (matches.isEmpty) {
                  return FadeIn(
                    child: const Text('NO ACTIVE MATCHES', style: TextStyle(color: Colors.white54, fontStyle: FontStyle.italic)),
                  );
                }
                return Column(
                  children: matches.map((m) {
                    final isMyTurn = m.status.contains('bowler') || m.status.contains('batsman'); // simplified
                    final color = isMyTurn ? const Color(0xFFE53935) : Colors.amber.shade700;
                    
                    String route = '/match/${m.id}/lobby';
                    if (m.status == 'toss') route = '/match/${m.id}/toss';
                    if (m.status == 'intro') route = '/match/${m.id}/intro';
                    if (m.status == 'live') route = '/match/${m.id}/live';

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16.0),
                      child: FadeInLeft(
                        child: _buildMatchCard(
                          context,
                          teamA: 'TEAM A', // Replace with actual names later
                          teamB: 'TEAM B',
                          status: m.status.toUpperCase(),
                          color: color,
                          onTap: () => context.go(route),
                        ),
                      ),
                    );
                  }).toList(),
                );
              },
            ),

            const SizedBox(height: 48),
            
            FadeInUp(
              delay: const Duration(milliseconds: 600),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => context.go('/match/create'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E293B),
                        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                          side: const BorderSide(color: Colors.white10),
                        ),
                        elevation: 0,
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_circle_outline, size: 48, color: Color(0xFF1E88E5)),
                          SizedBox(height: 16),
                          Text(
                            'HOST MATCH',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: Colors.white),
                          ),
                          SizedBox(height: 8),
                          Text('Create a new lobby', style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.normal, fontSize: 12)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        if (user != null) {
                          _showJoinMatchDialog(context, user.uid);
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please sign in first')));
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E293B),
                        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                          side: const BorderSide(color: Colors.white10),
                        ),
                        elevation: 0,
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.group_add_outlined, size: 48, color: Color(0xFFE53935)),
                          SizedBox(height: 16),
                          Text(
                            'JOIN MATCH',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: Colors.white),
                          ),
                          SizedBox(height: 8),
                          Text('Enter an invite code', style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.normal, fontSize: 12)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showJoinMatchDialog(BuildContext context, String uid) {
    final controller = TextEditingController();
    bool isJoining = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: const Text('JOIN MATCH', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 2)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Enter the invite code from your friend.', style: TextStyle(color: Colors.white54)),
              const SizedBox(height: 24),
              TextField(
                controller: controller,
                style: const TextStyle(color: Colors.white, fontSize: 20, letterSpacing: 4, fontWeight: FontWeight.bold),
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(
                  hintText: 'CODE',
                  hintStyle: const TextStyle(color: Colors.white24),
                  filled: true,
                  fillColor: const Color(0xFF0F172A),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.all(20),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('CANCEL', style: TextStyle(color: Colors.white54, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              onPressed: isJoining ? null : () async {
                final code = controller.text.trim().toLowerCase();
                if (code.isEmpty) return;

                setState(() => isJoining = true);
                
                final success = await apiService.joinMatch(uid, code);
                
                if (context.mounted) {
                  Navigator.pop(context);
                  if (success) {
                    context.go('/match/$code/lobby');
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Failed to join match. Check the code or connection.'),
                        backgroundColor: Colors.redAccent,
                      ),
                    );
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE53935),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: isJoining
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('JOIN', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMatchCard(BuildContext context, {required String teamA, required String teamB, required String status, required Color color, required VoidCallback onTap}) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              colors: [
                const Color(0xFF1E293B),
                color.withOpacity(0.1),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            border: Border(left: BorderSide(color: color, width: 4)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 10,
                offset: const Offset(0, 4),
              )
            ]
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$teamA vs $teamB',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      status,
                      style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1),
                    ),
                  )
                ],
              ),
              const Icon(Icons.chevron_right, color: Colors.white54),
            ],
          ),
        ),
      ),
    );
  }
}
