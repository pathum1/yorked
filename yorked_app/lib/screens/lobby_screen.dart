import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/match_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/widgets.dart';
import '../services/api_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class LobbyScreen extends ConsumerStatefulWidget {
  final String matchId;
  final bool isNew;
  const LobbyScreen({super.key, required this.matchId, this.isNew = false});

  @override
  ConsumerState<LobbyScreen> createState() => _LobbyScreenState();
}

class _LobbyScreenState extends ConsumerState<LobbyScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.isNew) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showShareDialog();
      });
    }
  }

  void _showShareDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text('MATCH CREATED!', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 2)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Share this link with your friends so they can join instantly:', style: TextStyle(color: Colors.white70)),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(12)),
              child: Row(
                children: [
                  Expanded(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text('yorked.duckdns.org/match/${widget.matchId}/lobby', style: const TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  IconButton(
                    icon: const Icon(Icons.copy, color: Colors.blueAccent),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: 'https://yorked.duckdns.org/match/${widget.matchId}/lobby'));
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invite link copied!')));
                    },
                  )
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('GOT IT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final matchAsync = ref.watch(currentMatchProvider(widget.matchId));
    final currentUser = ref.watch(authStateProvider).value;
    final isMobile = MediaQuery.of(context).size.width < 600;

    // Listen for player join events AND match status changes
    ref.listen(currentMatchProvider(widget.matchId), (previous, next) {
      final prevMatch = previous?.value;
      final currMatch = next.value;
      if (currMatch == null) return;

      // Auto-redirect when match status changes beyond lobby
      if (currMatch.status != 'lobby_open') {
        if (!context.mounted) return;
        switch (currMatch.status) {
          case 'deleted':
            return; // Let builder handle it
          case 'toss':
            context.go('/match/${widget.matchId}/toss');
            break;
          case 'in_progress':
          case 'innings_break':
            context.go('/match/${widget.matchId}/live');
            break;
          default:
            context.go('/match/${widget.matchId}/live');
        }
        return;
      }

      if (prevMatch == null) return;

      final prevCount = prevMatch.teamA.length + prevMatch.teamB.length;
      final currCount = currMatch.teamA.length + currMatch.teamB.length;

      if (currCount > prevCount) {
        // Find the new player UID
        final allPrev = [...prevMatch.teamA, ...prevMatch.teamB];
        final allCurr = [...currMatch.teamA, ...currMatch.teamB];
        final newUids = allCurr.where((uid) => !allPrev.contains(uid)).toList();

        for (final uid in newUids) {
          ref.read(playerByUidProvider(uid).future).then((player) {
            if (context.mounted) {
              final name = player?.displayName ?? 'A player';
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('🏏 $name joined the match!', style: const TextStyle(fontWeight: FontWeight.bold)),
                  backgroundColor: const Color(0xFF1E88E5),
                  duration: const Duration(seconds: 3),
                ),
              );
            }
          });
        }
      }
    });

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('MATCH LOBBY', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          Consumer(builder: (context, ref, _) {
            final match = ref.watch(currentMatchProvider(widget.matchId)).value;
            final user = ref.watch(authStateProvider).value;
            if (match != null && user?.uid == match.creatorId && match.status != 'deleted') {
              return IconButton(
                icon: const Icon(Icons.delete_forever, color: Colors.redAccent),
                tooltip: 'Delete Match',
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      backgroundColor: const Color(0xFF1E293B),
                      title: const Text('DELETE MATCH?', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                      content: const Text('Are you sure you want to delete this match? This cannot be undone.', style: TextStyle(color: Colors.white70)),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL', style: TextStyle(color: Colors.white54))),
                        ElevatedButton(
                          onPressed: () async {
                            Navigator.pop(ctx);
                            final username = ref.read(playerProfileProvider).value?.displayName ?? user?.displayName ?? 'the host';
                            await FirebaseFirestore.instance.collection('matches').doc(widget.matchId).update({
                              'status': 'deleted',
                              'deletedAt': DateTime.now().toIso8601String(),
                              'deletedBy': username,
                            });
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
                          child: const Text('DELETE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        )
                      ],
                    )
                  );
                },
              );
            }
            return const SizedBox.shrink();
          }),
        ],
      ),
      body: matchAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err', style: const TextStyle(color: Colors.red))),
        data: (match) {
          if (match == null) return const Center(child: Text('Match not found', style: TextStyle(color: Colors.white)));
          if (match.status == 'deleted') return DeletedMatchWidget(match: match);
          
          final isCreator = currentUser?.uid == match.creatorId;
          final isFull = (match.teamA.length + match.teamB.length) >= (match.teamSize * 2);

          return Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.blueAccent.withOpacity(0.5)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('INVITE LINK', style: TextStyle(color: Colors.white54, letterSpacing: 2, fontSize: 12)),
                            const SizedBox(height: 8),
                            GestureDetector(
                              onTap: () {
                                Clipboard.setData(ClipboardData(text: 'https://yorked.duckdns.org/match/${widget.matchId}/lobby'));
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invite link copied to clipboard!')));
                              },
                              child: MouseRegion(
                                cursor: SystemMouseCursors.click,
                                child: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text('yorked.duckdns.org/match/${widget.matchId}/lobby', style: const TextStyle(color: Colors.blueAccent, fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 1, decoration: TextDecoration.underline, decorationColor: Colors.blueAccent)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.copy, color: Colors.blueAccent),
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: 'https://yorked.duckdns.org/match/${widget.matchId}/lobby'));
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invite link copied to clipboard!')));
                        },
                      )
                    ],
                  ),
                ),
                
                const SizedBox(height: 32),
                
                Expanded(
                  child: isMobile
                      ? Column(
                          children: [
                            Expanded(child: _buildTeamList('TEAM A', match.teamA, match.teamSize, Colors.blue)),
                            const SizedBox(height: 16),
                            Expanded(child: _buildTeamList('TEAM B', match.teamB, match.teamSize, Colors.red)),
                          ],
                        )
                      : Row(
                          children: [
                            Expanded(child: _buildTeamList('TEAM A', match.teamA, match.teamSize, Colors.blue)),
                            const SizedBox(width: 32),
                            Expanded(child: _buildTeamList('TEAM B', match.teamB, match.teamSize, Colors.red)),
                          ],
                        ),
                ),

                const SizedBox(height: 32),
                
                if (isCreator)
                  ElevatedButton(
                    onPressed: isFull ? () async {
                       await FirebaseFirestore.instance
                          .collection('matches')
                          .doc(widget.matchId)
                          .update({'status': 'toss'});
                       // The stream listener inside `build` will handle navigating the host
                    } : null,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 48),
                      backgroundColor: Colors.amber.shade700,
                      disabledBackgroundColor: Colors.grey.shade800,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const FittedBox(fit: BoxFit.scaleDown, child: Text('PROCEED TO TOSS', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 2))),
                  )
                else if (!match.teamA.contains(currentUser?.uid) && !match.teamB.contains(currentUser?.uid))
                  _JoinMatchActionWidget(matchId: widget.matchId, isFull: isFull)
                else
                  const Text('Waiting for host to start the match...', style: TextStyle(color: Colors.white54, fontStyle: FontStyle.italic)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildTeamList(String title, List<String> players, int maxSize, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border(top: BorderSide(color: color, width: 4)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 18, letterSpacing: 2)),
                Text('${players.length} / $maxSize', style: const TextStyle(color: Colors.white54, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          const Divider(color: Colors.white10, height: 1),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: players.length,
              itemBuilder: (context, index) {
                final uid = players[index];
                return Consumer(
                  builder: (context, ref, _) {
                    final playerAsync = ref.watch(playerByUidProvider(uid));
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: playerAsync.when(
                        loading: () => const PlayerCardWidget(name: 'Loading...', avatarId: '?', role: '...'),
                        error: (_, __) => PlayerCardWidget(name: uid.substring(0, 8), avatarId: '?', role: 'Unknown'),
                        data: (player) => PlayerCardWidget(
                          name: player?.displayName ?? uid.substring(0, 8),
                          avatarId: player?.avatarId ?? '?',
                          role: player?.role ?? 'Unknown',
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _JoinMatchActionWidget extends ConsumerStatefulWidget {
  final String matchId;
  final bool isFull;

  const _JoinMatchActionWidget({required this.matchId, required this.isFull});

  @override
  ConsumerState<_JoinMatchActionWidget> createState() => _JoinMatchActionWidgetState();
}

class _JoinMatchActionWidgetState extends ConsumerState<_JoinMatchActionWidget> {
  bool _isJoining = false;

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(authStateProvider).value;

    if (widget.isFull) {
       return const Text('Match is currently full.', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold));
    }

    final buttonText = currentUser == null ? 'SIGN IN WITH GOOGLE TO JOIN' : 'JOIN THIS MATCH';
    final buttonColor = currentUser == null ? const Color(0xFF1E88E5) : const Color(0xFFE53935);

    return ElevatedButton(
      onPressed: _isJoining
          ? null
          : () async {
              setState(() => _isJoining = true);
              
              try {
                String uidToJoin = currentUser?.uid ?? '';

                if (currentUser == null) {
                  // Unauthenticated flow
                  final authService = ref.read(authServiceProvider);
                  final userCred = await authService.signInWithGoogle();
                  
                  if (userCred == null || userCred.user == null) {
                     if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sign in failed or cancelled')));
                     return;
                  }
                  
                  uidToJoin = userCred.user!.uid;

                  // Check if they have a player profile
                  final profile = await ref.read(playerProfileProvider.future);
                  if (profile == null) {
                     // No profile, redirect to setup with return URL
                     if (context.mounted) {
                        context.go('/profile/setup', extra: '/match/${widget.matchId}/lobby');
                     }
                     return;
                  }
                }

                // Authenticated or just finished signing in and has a profile
                final success = await apiService.joinMatch(uidToJoin, widget.matchId);
                if (!success && context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to join match.')));
                }
              } finally {
                if (mounted) setState(() => _isJoining = false);
              }
            },
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 48),
        backgroundColor: buttonColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      child: _isJoining
          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
          : FittedBox(fit: BoxFit.scaleDown, child: Text(buttonText, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 2))),
    );
  }

  Widget _buildTeamList(String title, List<String> players, int maxSize, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border(top: BorderSide(color: color, width: 4)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 18, letterSpacing: 2)),
                Text('${players.length} / $maxSize', style: const TextStyle(color: Colors.white54, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          const Divider(color: Colors.white10, height: 1),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: players.length,
              itemBuilder: (context, index) {
                // In a real app we'd fetch the player profile here by mapping over the IDs.
                // For UI display purporses let's just show a dummy player card using the ID
                return const Padding(
                  padding: EdgeInsets.only(bottom: 12.0),
                  child: PlayerCardWidget(
                    name: 'Player Name', // Placeholder
                    avatarId: 'tiger',   // Placeholder
                    role: 'Batsman',     // Placeholder
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
