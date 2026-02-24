import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../widgets/widgets.dart';

class BattingScreen extends ConsumerStatefulWidget {
  final String matchId;
  const BattingScreen({super.key, required this.matchId});

  @override
  ConsumerState<BattingScreen> createState() => _BattingScreenState();
}

class _BattingScreenState extends ConsumerState<BattingScreen> {
  String? _selectedShot;
  bool _isSubmitting = false;

  final List<Map<String, dynamic>> _shots = [
    {'id': 'Defensive', 'icon': Icons.shield, 'desc': 'Block the ball, minimize risk'},
    {'id': 'Drive', 'icon': Icons.sports_cricket, 'desc': 'Classic straight bat stroke'},
    {'id': 'Cut', 'icon': Icons.switch_left, 'desc': 'Width outside off slump'},
    {'id': 'Pull', 'icon': Icons.switch_right, 'desc': 'Aggressive across the line'},
    {'id': 'Sweep', 'icon': Icons.rotate_left, 'desc': 'Down on one knee for spin'},
    {'id': 'Lofted', 'icon': Icons.air, 'desc': 'Hitting over the infield'},
    {'id': 'Leave', 'icon': Icons.do_not_disturb, 'desc': 'Letting the ball pass safely'},
    {'id': 'ReverseSweep', 'icon': Icons.rotate_right, 'desc': 'High risk, high reward innovation'},
  ];

  void _submitShot() async {
    if (_selectedShot == null) return;
    setState(() => _isSubmitting = true);

    final currentUser = ref.read(authStateProvider).value;
    if (currentUser == null) {
      setState(() => _isSubmitting = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Not authenticated yet, please wait...')));
      return;
    }

    final error = await apiService.submitShot(widget.matchId, currentUser.uid, _selectedShot!);
    setState(() => _isSubmitting = false);

    if (error == null && mounted) {
      context.go('/match/${widget.matchId}/live');
    } else {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $error')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('SELECT SHOT', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(icon: const Icon(Icons.home, color: Colors.white54), onPressed: () => context.go('/dashboard')),
        ],
      ),
      body: Column(
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
              itemCount: _shots.length,
              itemBuilder: (context, index) {
                final s = _shots[index];
                return ActionCardWidget(
                  title: s['id'],
                  description: s['desc'],
                  icon: s['icon'],
                  isSelected: _selectedShot == s['id'],
                  baseColor: const Color(0xFF1E88E5), // Blue theme for batting
                  onTap: () => setState(() => _selectedShot = s['id']),
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
                         onPressed: _selectedShot == null || _isSubmitting ? null : _submitShot,
                         style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            backgroundColor: const Color(0xFF1E88E5),
                            disabledBackgroundColor: Colors.grey.shade800,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                         ),
                         child: _isSubmitting
                             ? const CircularProgressIndicator(color: Colors.white)
                             : const Text('PLAY SHOT', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.white)),
                      ),
                   ),
                ],
             ),
          )
        ],
      ),
    );
  }
}
