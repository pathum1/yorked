import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';

class CreateMatchScreen extends ConsumerStatefulWidget {
  const CreateMatchScreen({super.key});

  @override
  ConsumerState<CreateMatchScreen> createState() => _CreateMatchScreenState();
}

class _CreateMatchScreenState extends ConsumerState<CreateMatchScreen> {
  int _selectedOvers = 5;
  int _selectedTeamSize = 11;
  bool _isLoading = false;

  void _createMatch() async {
    final user = ref.read(authStateProvider).value;
    if (user == null) return;

    setState(() => _isLoading = true);

    final matchId = await apiService.createMatch(user.uid, _selectedOvers, _selectedTeamSize);
    
    setState(() => _isLoading = false);

    if (matchId != null && mounted) {
      context.go('/match/$matchId/lobby', extra: {'isNew': true});
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to create match. Check backend connection.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('CREATE MATCH', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 600),
          padding: const EdgeInsets.all(32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('MATCH SETTINGS', style: TextStyle(color: Color(0xFF94A3B8), letterSpacing: 2, fontWeight: FontWeight.bold)),
              const SizedBox(height: 32),
              
              const Text('OVERS PER INNINGS', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              _buildOversSelector(),

              const SizedBox(height: 48),

              const Text('TEAM SIZE', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              _buildTeamSizeSelector(),

              const SizedBox(height: 64),

              ElevatedButton(
                onPressed: _isLoading ? null : _createMatch,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  backgroundColor: const Color(0xFF1E88E5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('HOST MATCH', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.white)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOversSelector() {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _buildOverOption(5, '5 Overs'),
        _buildOverOption(10, '10 Overs'),
        _buildOverOption(20, 'T20'),
      ],
    );
  }

  Widget _buildOverOption(int value, String label) {
    final isSelected = _selectedOvers == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedOvers = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1E88E5) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? const Color(0xFF42A5F5) : Colors.white10, width: 2),
        ),
        child: Text(label, style: TextStyle(
          color: isSelected ? Colors.white : Colors.white54,
          fontWeight: FontWeight.bold,
          fontSize: 16,
        )),
      ),
    );
  }

  Widget _buildTeamSizeSelector() {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _buildTeamOption(1, '1v1 Solo'),
        _buildTeamOption(2, '2v2 Quick'),
        _buildTeamOption(6, '6v6 Half'),
        _buildTeamOption(11, '11v11 Full'),
      ],
    );
  }

  Widget _buildTeamOption(int value, String label) {
    final isSelected = _selectedTeamSize == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedTeamSize = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFE53935) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? const Color(0xFFEF5350) : Colors.white10, width: 2),
        ),
        child: Text(label, style: TextStyle(
          color: isSelected ? Colors.white : Colors.white54,
          fontWeight: FontWeight.bold,
          fontSize: 16,
        )),
      ),
    );
  }
}
