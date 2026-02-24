import 'package:flutter/material.dart';

class ActionCardWidget extends StatelessWidget {
  final String title;
  final String description;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;
  final Color baseColor;

  const ActionCardWidget({
    super.key,
    required this.title,
    required this.description,
    required this.icon,
    required this.isSelected,
    required this.onTap,
    this.baseColor = const Color(0xFF1E88E5), // Base blue
  });

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
             color: isSelected ? baseColor.withOpacity(0.15) : const Color(0xFF1E293B),
             borderRadius: BorderRadius.circular(20),
             border: Border.all(
               color: isSelected ? baseColor : Colors.white10,
               width: isSelected ? 3 : 1,
             ),
             boxShadow: isSelected ? [
                BoxShadow(
                   color: baseColor.withOpacity(0.3),
                   blurRadius: 15,
                   spreadRadius: 2,
                )
             ] : [],
          ),
          child: Column(
             mainAxisAlignment: MainAxisAlignment.center,
             children: [
                Icon(
                   icon,
                   size: 48,
                   color: isSelected ? baseColor : Colors.white70,
                ),
                const SizedBox(height: 16),
                Text(
                   title.toUpperCase(),
                   textAlign: TextAlign.center,
                   style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.5,
                      color: isSelected ? baseColor : Colors.white,
                   ),
                ),
                const SizedBox(height: 8),
                Text(
                   description,
                   textAlign: TextAlign.center,
                   style: const TextStyle(
                      color: Colors.white54,
                      fontSize: 12,
                   ),
                )
             ],
          ),
        ),
      ),
    );
  }
}
