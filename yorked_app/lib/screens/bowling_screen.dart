import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../widgets/widgets.dart';

class BowlingScreen extends ConsumerStatefulWidget {
  final String matchId;
  const BowlingScreen({super.key, required this.matchId});

  @override
  ConsumerState<BowlingScreen> createState() => _BowlingScreenState();
}

class _BowlingScreenState extends ConsumerState<BowlingScreen> {
  String? _selectedDelivery;
  bool _isSubmitting = false;

  final List<Map<String, dynamic>> _fastDeliveries = [
    {'id': 'Yorker', 'icon': Icons.arrow_downward, 'desc': 'Pinpoint accuracy at the toes'},
    {'id': 'Bouncer', 'icon': Icons.arrow_upward, 'desc': 'High bounce, aggressive pacing'},
    {'id': 'GoodLength', 'icon': Icons.horizontal_rule, 'desc': 'Standard stock delivery'},
    {'id': 'Inswinger', 'icon': Icons.arrow_back, 'desc': 'Moving into the right-hander'},
    {'id': 'Outswinger', 'icon': Icons.arrow_forward, 'desc': 'Moving away from the bat'},
    {'id': 'SlowerBall', 'icon': Icons.speed, 'desc': 'Deceptive lack of pace'},
    {'id': 'FullToss', 'icon': Icons.sports_baseball, 'desc': 'Missing the pitch entirely (Risky)'},
    {'id': 'HalfVolley', 'icon': Icons.bolt, 'desc': 'Pitched up in the slot'},
  ];

  final List<Map<String, dynamic>> _spinDeliveries = [
    {'id': 'Off-spin', 'icon': Icons.rotate_left, 'desc': 'Turns into the right-hander'},
    {'id': 'Leg-spin', 'icon': Icons.rotate_right, 'desc': 'Turns away from the bat'},
    {'id': 'Googly', 'icon': Icons.visibility_off, 'desc': 'The wrong un, turns in'},
    {'id': 'Slider', 'icon': Icons.fast_forward, 'desc': 'Pushed through quicker, straight'},
    {'id': 'Tossed Up', 'icon': Icons.arrow_upward, 'desc': 'Flighted delivery to tempt the batsman'},
    {'id': 'Arm Ball', 'icon': Icons.arrow_forward, 'desc': 'Drifts with the arm, no turn'},
    {'id': 'Flipper', 'icon': Icons.arrow_downward, 'desc': 'Skids on low and fast'},
    {'id': 'FullToss', 'icon': Icons.sports_baseball, 'desc': 'A mistake in flight (Risky)'},
  ];

  void _submitDelivery() async {
    if (_selectedDelivery == null) return;
    setState(() => _isSubmitting = true);

    final currentUser = ref.read(authStateProvider).value;
    if (currentUser == null) {
      setState(() => _isSubmitting = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Not authenticated yet, please wait...')));
      return;
    }

    final error = await apiService.submitDelivery(widget.matchId, currentUser.uid, _selectedDelivery!);
    setState(() => _isSubmitting = false);

    if (error == null && mounted) {
      context.go('/match/${widget.matchId}/live');
    } else {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $error')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final playerAsync = ref.watch(playerProfileProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('SELECT DELIVERY', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(icon: const Icon(Icons.home, color: Colors.white54), onPressed: () => context.go('/dashboard')),
        ],
      ),
      body: playerAsync.when(
        data: (player) {
          final isSpin = player?.bowlingStyle == 'spin';
          final deliveries = isSpin ? _spinDeliveries : _fastDeliveries;

          return Column(
            children: [
              Expanded(
                child: GridView.builder(
                  padding: const EdgeInsets.all(24),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: MediaQuery.of(context).size.width > 600 ? 2.5 : 1.2,
                  ),
                  itemCount: deliveries.length,
                  itemBuilder: (context, index) {
                    final d = deliveries[index];
                    return ActionCardWidget(
                      title: d['id'],
                      description: d['desc'],
                      icon: d['icon'],
                      isSelected: _selectedDelivery == d['id'],
                      baseColor: const Color(0xFFE53935), // Red theme for bowling
                      onTap: () => setState(() => _selectedDelivery = d['id']),
                    );
                  },
                ),
              ),
              Container(
                padding: const EdgeInsets.all(32),
                decoration: const BoxDecoration(
                  color: Color(0xFF1E293B),
                  border: Border(top: BorderSide(color: Colors.white10, width: 2)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _selectedDelivery == null || _isSubmitting ? null : _submitDelivery,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          backgroundColor: const Color(0xFFE53935),
                          disabledBackgroundColor: Colors.grey.shade800,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        child: _isSubmitting
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text('BOWL BALL', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.white)),
                      ),
                    ),
                  ],
                ),
              )
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFFE53935))),
        error: (e, s) => Center(child: Text('Error loading profile: $e', style: const TextStyle(color: Colors.white))),
      ),
    );
  }
}
