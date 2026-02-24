import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Match History'),
        actions: [
          IconButton(icon: const Icon(Icons.home, color: Colors.white54), onPressed: () => context.go('/dashboard')),
        ],
      ),
      body: Center(
        child: ElevatedButton(
          onPressed: () => context.go('/dashboard'),
          child: const Text('Back to Dashboard'),
        ),
      ),
    );
  }
}
