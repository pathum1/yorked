import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/firestore_service.dart';
import '../models/player.dart';
import '../providers/auth_provider.dart';

class ProfileSetupScreen extends ConsumerStatefulWidget {
  final String? redirectUrl;
  const ProfileSetupScreen({super.key, this.redirectUrl});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen> {
  final _nameController = TextEditingController();
  
  String selectedAvatar = 'tiger'; // Default
  String selectedRole = 'Pure Batsman';
  String selectedBowlingStyle = 'Fast';
  
  // Attribute Points
  int tech = 1;
  int pow = 1;
  int tim = 1;
  int acc = 1;
  int pac = 1;
  int varP = 1;

  final List<String> avatars = ['tiger', 'lion', 'eagle', 'helmet', 'bat', 'ball', 'shield', 'flame', 'star', 'gloves', 'cap', 'stumps'];
  
  @override
  void initState() {
    super.initState();
    // Pre-fill name from Google Auth if available
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(authStateProvider).value;
      if (user != null && user.displayName != null) {
        setState(() {
          _nameController.text = user.displayName!;
        });
      }
    });
  }

  int get totalPointsSpent => (tech + pow + tim + acc + pac + varP) - 6; // Base 1 point each = 6
  int get remainingPoints => 10 - totalPointsSpent;

  int get battingPoints => (tech + pow + tim) - 3;
  int get bowlingPoints => (acc + pac + varP) - 3;

  bool get _canSave {
     if (_nameController.text.trim().isEmpty) return false;
     if (remainingPoints != 0) return false; // Must spend all 10 points
     
     // Role caps
     if (selectedRole == 'Pure Batsman') {
        if (battingPoints > 7) return false;
     } else if (selectedRole == 'Pure Bowler') {
        if (bowlingPoints > 7) return false;
     } else { // All-rounder
        if (battingPoints > 5 || bowlingPoints > 5) return false;
     }
     return true;
  }

  void _adjustAttr(String attr, int amount) {
    setState(() {
      int newVal = 0;
      switch(attr) {
        case 'tech': newVal = tech + amount; if (newVal >= 1 && newVal <= 7) { tech = newVal; } break;
        case 'pow': newVal = pow + amount; if (newVal >= 1 && newVal <= 7) { pow = newVal; } break;
        case 'tim': newVal = tim + amount; if (newVal >= 1 && newVal <= 7) { tim = newVal; } break;
        case 'acc': newVal = acc + amount; if (newVal >= 1 && newVal <= 7) { acc = newVal; } break;
        case 'pac': newVal = pac + amount; if (newVal >= 1 && newVal <= 7) { pac = newVal; } break;
        case 'varP': newVal = varP + amount; if (newVal >= 1 && newVal <= 7) { varP = newVal; } break;
      }
    });
  }

  int _getAttr(String attr) {
     switch(attr) {
        case 'tech': return tech;
        case 'pow': return pow;
        case 'tim': return tim;
        case 'acc': return acc;
        case 'pac': return pac;
        case 'varP': return varP;
        default: return 1;
     }
  }

  void _saveProfile() async {
    if (!_canSave) return;
    
    final user = ref.read(authStateProvider).value;
    if (user == null) return;

    final player = Player(
      uid: user.uid,
      displayName: _nameController.text.trim(),
      avatarId: selectedAvatar,
      role: selectedRole,
      bowlingStyle: selectedBowlingStyle,
      batting: BattingAttributes(technique: tech, power: pow, timing: tim),
      bowling: BowlingAttributes(accuracy: acc, pace: pac, variation: varP),
      careerStats: CareerStats(),
      fcmToken: null,
    );

    await firestoreService.createUserProfile(user.uid, player);
    
    // Invalidate profile provider so it re-fetches
    ref.invalidate(playerProfileProvider);
    if (mounted) {
      if (widget.redirectUrl != null) {
        context.go(widget.redirectUrl!);
      } else {
        context.go('/dashboard');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('PLAYER PROFILE SETUP', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.symmetric(horizontal: isMobile ? 20 : 40, vertical: 20),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildSectionTitle('DISPLAY NAME'),
                TextField(
                  controller: _nameController,
                  decoration: InputDecoration(
                     filled: true,
                     fillColor: const Color(0xFF1E293B),
                     border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                  style: const TextStyle(fontSize: 18),
                  onChanged: (v) => setState((){}),
                ),
                
                const SizedBox(height: 32),
                _buildSectionTitle('CHOOSE AVATAR'),
                Wrap(
                  spacing: 12, runSpacing: 12,
                  children: avatars.map((a) => GestureDetector(
                    onTap: () => setState(() => selectedAvatar = a),
                    child: Container(
                      width: 60, height: 60,
                      decoration: BoxDecoration(
                        color: selectedAvatar == a ? const Color(0xFF1E88E5) : const Color(0xFF1E293B),
                        shape: BoxShape.circle,
                        border: Border.all(color: selectedAvatar == a ? Colors.white : Colors.white10, width: 2),
                      ),
                      child: Center(child: Text(a.substring(0,1).toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 24))),
                    ),
                  )).toList(),
                ),

                const SizedBox(height: 32),
                isMobile
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _buildSectionTitle('ROLE'),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              isExpanded: true,
                              value: selectedRole,
                              items: ['Pure Batsman', 'Pure Bowler', 'All-Rounder'].map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                              onChanged: (v) => setState(() => selectedRole = v!),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        _buildSectionTitle('BOWLING STYLE'),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              isExpanded: true,
                              value: selectedBowlingStyle,
                              items: ['Fast', 'Medium', 'Off-spin', 'Leg-spin'].map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                              onChanged: (v) => setState(() => selectedBowlingStyle = v!),
                            ),
                          ),
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionTitle('ROLE'),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                                child: DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    isExpanded: true,
                                    value: selectedRole,
                                    items: ['Pure Batsman', 'Pure Bowler', 'All-Rounder'].map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                                    onChanged: (v) => setState(() => selectedRole = v!),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 24),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionTitle('BOWLING STYLE'),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                                child: DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    isExpanded: true,
                                    value: selectedBowlingStyle,
                                    items: ['Fast', 'Medium', 'Off-spin', 'Leg-spin'].map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                                    onChanged: (v) => setState(() => selectedBowlingStyle = v!),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                const SizedBox(height: 32),
                isMobile
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                         _buildSectionTitle('ATTRIBUTE POINTS'),
                         const SizedBox(height: 8),
                         Container(
                           padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                           decoration: BoxDecoration(
                             color: remainingPoints == 0 ? Colors.green.withOpacity(0.2) : Colors.orange.withOpacity(0.2),
                             borderRadius: BorderRadius.circular(20),
                             border: Border.all(color: remainingPoints == 0 ? Colors.green : Colors.orange),
                           ),
                           child: Text('REMAINING: $remainingPoints / 10', style: TextStyle(fontWeight: FontWeight.bold, color: remainingPoints == 0 ? Colors.green : Colors.orangeAccent)),
                         )
                      ],
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                         _buildSectionTitle('ATTRIBUTE POINTS'),
                         Container(
                           padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                           decoration: BoxDecoration(
                             color: remainingPoints == 0 ? Colors.green.withOpacity(0.2) : Colors.orange.withOpacity(0.2),
                             borderRadius: BorderRadius.circular(20),
                             border: Border.all(color: remainingPoints == 0 ? Colors.green : Colors.orange),
                           ),
                           child: Text('REMAINING: $remainingPoints / 10', style: TextStyle(fontWeight: FontWeight.bold, color: remainingPoints == 0 ? Colors.green : Colors.orangeAccent)),
                         )
                      ],
                    ),
                const SizedBox(height: 8),
                Text(_getRoleCapText(), style: const TextStyle(color: Colors.white54, fontStyle: FontStyle.italic)),
                const SizedBox(height: 16),

                isMobile
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _buildAttrColumn('BATTING', ['Technique', 'Power', 'Timing'], ['tech', 'pow', 'tim'], Colors.blueAccent),
                        const SizedBox(height: 24),
                        _buildAttrColumn('BOWLING', ['Accuracy', 'Pace', 'Variation'], ['acc', 'pac', 'varP'], Colors.redAccent),
                      ],
                    )
                  : Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: _buildAttrColumn('BATTING', ['Technique', 'Power', 'Timing'], ['tech', 'pow', 'tim'], Colors.blueAccent)),
                        const SizedBox(width: 32),
                        Expanded(child: _buildAttrColumn('BOWLING', ['Accuracy', 'Pace', 'Variation'], ['acc', 'pac', 'varP'], Colors.redAccent)),
                      ],
                    ),

                const SizedBox(height: 48),
                ElevatedButton(
                  onPressed: _canSave ? _saveProfile : null,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    backgroundColor: const Color(0xFF1E88E5),
                    disabledBackgroundColor: Colors.grey.shade800,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text('CREATE PROFILE', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.white)),
                ),
                const SizedBox(height: 48),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _getRoleCapText() {
    if (selectedRole == 'Pure Batsman') return 'Pure Batsman: Max 7 pts in Batting, Min 1 pt in Bowling (+3 base)';
    if (selectedRole == 'Pure Bowler') return 'Pure Bowler: Max 7 pts in Bowling, Min 1 pt in Batting (+3 base)';
    return 'All-Rounder: Max 5 pts in Batting, Max 5 pts in Bowling (+3 base)';
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Text(title, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 2)),
    );
  }

  Widget _buildAttrColumn(String title, List<String> labels, List<String> keys, Color color) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border(top: BorderSide(color: color, width: 4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold, letterSpacing: 2)),
          const SizedBox(height: 24),
          ...List.generate(labels.length, (i) => Padding(
            padding: const EdgeInsets.only(bottom: 16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(labels[i], style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline),
                      color: Colors.white54,
                      onPressed: _getAttr(keys[i]) > 1 ? () => _adjustAttr(keys[i], -1) : null,
                    ),
                    SizedBox(width: 30, child: Center(child: Text(_getAttr(keys[i]).toString(), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)))),
                    IconButton(
                      icon: const Icon(Icons.add_circle),
                      color: remainingPoints > 0 && _getAttr(keys[i]) < 7 ? color : Colors.white24,
                      onPressed: remainingPoints > 0 && _getAttr(keys[i]) < 7 ? () => _adjustAttr(keys[i], 1) : null,
                    ),
                  ],
                )
              ],
            ),
          ))
        ],
      ),
    );
  }
}
