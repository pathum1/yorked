import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/match_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/widgets.dart';

class MatchLiveScreen extends ConsumerWidget {
  final String matchId;
  const MatchLiveScreen({super.key, required this.matchId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matchAsync = ref.watch(currentMatchProvider(matchId));
    final currentUser = ref.watch(authStateProvider).value;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('LIVE MATCH', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.home, color: Colors.white54), onPressed: () => context.go('/dashboard')),
        ],
      ),
      body: matchAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error: $e', style: const TextStyle(color: Colors.red))),
        data: (match) {
          if (match == null) return const Center(child: Text('Match not found', style: TextStyle(color: Colors.white)));
          if (match.status == 'deleted') return DeletedMatchWidget(match: match);

          final innings = match.currentInningsData;
          if (innings == null) {
            return const Center(child: Text('Innings not started', style: TextStyle(color: Colors.white54)));
          }

          // Extract stats from correct innings fields
          final currentScore = innings['runs'] ?? 0;
          final currentWickets = innings['wickets'] ?? 0;
          final ballsBowled = innings['balls'] ?? 0;
          final oversBowled = ballsBowled / 6.0;

          final battingTeam = innings['battingTeam'] ?? 'A';
          final bowlingTeam = innings['bowlingTeam'] ?? 'B';
          final target = match.currentInnings == 2 && match.innings1 != null
              ? (match.innings1!['runs'] ?? 0) + 1
              : null;

          // Current player UIDs
          final strikerId = innings['currentStrikerUid'];
          final nonStrikerId = innings['currentNonStrikerUid'];
          final bowlerId = innings['currentBowlerUid'];

          final isDeliveryPending = innings['pendingBall'] == null || innings['pendingBall']?['delivery'] == null;
          final isShotPending = !isDeliveryPending && innings['pendingBall']?['shot'] == null;

          // Captain of the bowling team can assign bowler
          final bowlingCaptain = bowlingTeam == 'A' ? match.teamACaptain : match.teamBCaptain;
          final isBowlingCaptain = currentUser?.uid == bowlingCaptain;

          // Check for match status transitions
          if (match.status == 'innings_break') {
            Future.microtask(() => context.go('/match/$matchId/break'));
          }
          if (match.status == 'completed') {
            Future.microtask(() => context.go('/match/$matchId/victory'));
          }

          return SafeArea(
            child: Column(
              children: [
                ScoreboardWidget(
                  totalRuns: currentScore,
                  totalWickets: currentWickets,
                  oversBowled: oversBowled,
                  battingTeamName: 'TEAM $battingTeam',
                  target: target,
                ),

                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        // Bowler Section
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(20)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('CURRENT BOWLER', style: TextStyle(color: Colors.white54, letterSpacing: 2, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 16),
                              bowlerId != null
                                  ? Consumer(builder: (context, ref, _) {
                                      final playerAsync = ref.watch(playerByUidProvider(bowlerId));
                                      return playerAsync.when(
                                        loading: () => const PlayerCardWidget(name: 'Loading...', avatarId: '?', role: 'Bowler'),
                                        error: (_, __) => const PlayerCardWidget(name: 'Unknown', avatarId: '?', role: 'Bowler'),
                                        data: (player) => PlayerCardWidget(
                                          name: player?.displayName ?? 'Bowler',
                                          avatarId: player?.avatarId ?? 'ball',
                                          role: player?.role ?? 'Bowler',
                                        ),
                                      );
                                    })
                                  : const PlayerCardWidget(name: 'Awaiting assignment...', avatarId: '?', role: 'Bowler'),
                            ],
                          ),
                        ),

                        const Text('VS', style: TextStyle(color: Colors.white24, fontSize: 32, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),

                        // Batsmen Section
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(20)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('BATSMEN', style: TextStyle(color: Colors.white54, letterSpacing: 2, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 16),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceAround,
                                children: [
                                  if (strikerId != null)
                                    Consumer(builder: (context, ref, _) {
                                      final playerAsync = ref.watch(playerByUidProvider(strikerId));
                                      return playerAsync.when(
                                        loading: () => const PlayerCardWidget(name: 'Loading...', avatarId: '?', role: 'Batsman', isStriker: true),
                                        error: (_, __) => const PlayerCardWidget(name: 'Striker', avatarId: '?', role: 'Batsman', isStriker: true),
                                        data: (player) => PlayerCardWidget(
                                          name: player?.displayName ?? 'Striker',
                                          avatarId: player?.avatarId ?? 'bat',
                                          role: 'Striker',
                                          isStriker: true,
                                        ),
                                      );
                                    })
                                  else
                                    const PlayerCardWidget(name: 'TBD', avatarId: '?', role: 'Batsman', isStriker: true),
                                  
                                  if (match.teamSize > 1) ...[
                                    if (nonStrikerId != null)
                                      Consumer(builder: (context, ref, _) {
                                        final playerAsync = ref.watch(playerByUidProvider(nonStrikerId));
                                        return playerAsync.when(
                                          loading: () => const PlayerCardWidget(name: 'Loading...', avatarId: '?', role: 'Batsman'),
                                          error: (_, __) => const PlayerCardWidget(name: 'Non-Striker', avatarId: '?', role: 'Batsman'),
                                          data: (player) => PlayerCardWidget(
                                            name: player?.displayName ?? 'Non-Striker',
                                            avatarId: player?.avatarId ?? 'helmet',
                                            role: 'Non-Striker',
                                          ),
                                        );
                                      })
                                    else
                                      const PlayerCardWidget(name: 'N/A', avatarId: '-', role: 'Non-Striker'),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Action Bar
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: const BoxDecoration(
                    color: Color(0xFF1E293B),
                    border: Border(top: BorderSide(color: Colors.white10, width: 2)),
                  ),
                  child: Center(
                    child: _buildActionButton(context, currentUser?.uid, strikerId, bowlerId, isDeliveryPending, isShotPending, isBowlingCaptain, bowlerId == null, matchId),
                  ),
                )
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildActionButton(BuildContext context, String? currentUid, String? strikerId, String? bowlerId, bool isDeliveryPending, bool isShotPending, bool isBowlingCaptain, bool needsBowlerAssigned, String mId) {
    if (needsBowlerAssigned && isBowlingCaptain) {
      return ElevatedButton.icon(
        icon: const Icon(Icons.person_add),
        label: const Text('ASSIGN NEXT BOWLER', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 2)),
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 20),
          backgroundColor: Colors.amber.shade700,
          foregroundColor: Colors.white,
        ),
        onPressed: () {
          // TODO: Open bowler selection dialog
        },
      );
    }

    final isMyTurnToBat = currentUid == strikerId && isShotPending;
    final isMyTurnToBowl = currentUid == bowlerId && isDeliveryPending;

    if (isMyTurnToBat) {
      return ElevatedButton.icon(
        icon: const Icon(Icons.sports_cricket),
        label: const Text('PLAY SHOT', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 3)),
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 64, vertical: 24),
          backgroundColor: const Color(0xFF1E88E5),
          foregroundColor: Colors.white,
          elevation: 10,
          shadowColor: const Color(0xFF1E88E5).withOpacity(0.5),
        ),
        onPressed: () => context.go('/match/$mId/bat'),
      );
    }

    if (isMyTurnToBowl) {
      return ElevatedButton.icon(
        icon: const Icon(Icons.sports_baseball),
        label: const Text('BOWL BALL', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 3)),
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 64, vertical: 24),
          backgroundColor: const Color(0xFFE53935),
          foregroundColor: Colors.white,
          elevation: 10,
          shadowColor: const Color(0xFFE53935).withOpacity(0.5),
        ),
        onPressed: () => context.go('/match/$mId/bowl'),
      );
    }

    if (currentUid == strikerId && isDeliveryPending) {
      return const Text('WAITING FOR BOWLER...', style: TextStyle(color: Colors.white54, fontSize: 16, letterSpacing: 2, fontStyle: FontStyle.italic));
    }
    
    if (currentUid == bowlerId && isShotPending) {
      return const Text('WAITING FOR BATSMAN...', style: TextStyle(color: Colors.white54, fontSize: 16, letterSpacing: 2, fontStyle: FontStyle.italic));
    }

    return const Text('WAITING FOR PLAYERS TO ACT...', style: TextStyle(color: Colors.white54, fontSize: 16, letterSpacing: 2, fontStyle: FontStyle.italic));
  }
}
