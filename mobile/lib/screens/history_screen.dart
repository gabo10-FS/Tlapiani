import 'package:flutter/material.dart';
import '../models/lote_model.dart';
import '../services/database_service.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Entrega> _entregas = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _isLoading = true;
    });
    final db = DatabaseService.instance;
    final list = await db.readAllEntregas();
    setState(() {
      _entregas = list;
      _isLoading = false;
    });
  }

  Future<void> _deleteEntrega(int id) async {
    final db = DatabaseService.instance;
    await db.deleteEntrega(id);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Registro eliminado localmente.'),
        backgroundColor: Colors.blueGrey,
      ),
    );
    _loadHistory();
  }

  Future<void> _clearAll() async {
    final theme = Theme.of(context);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: theme.cardTheme.color ?? theme.colorScheme.surface,
        title: Text('¿Eliminar todo?', style: TextStyle(color: theme.textTheme.titleLarge?.color)),
        content: Text(
          'Esto borrará todo el historial local de SQLite de forma permanente.',
          style: TextStyle(color: theme.textTheme.bodyMedium?.color?.withOpacity(0.8)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Eliminar Todo', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final db = DatabaseService.instance;
      await db.clearAll();
      _loadHistory();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Historial Local SQLite'),
        actions: [
          if (_entregas.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep, color: Colors.redAccent),
              onPressed: _clearAll,
              tooltip: 'Borrar todo el historial',
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
          : _entregas.isEmpty
              ? _buildEmptyState(context)
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _entregas.length,
                  itemBuilder: (context, index) {
                    final entrega = _entregas[index];
                    final Color statusColor =
                        entrega.integridadValidada ? const Color(0xFF10B981) : Colors.redAccent;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: statusColor.withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      child: ExpansionTile(
                        iconColor: theme.textTheme.bodyLarge?.color,
                        collapsedIconColor: theme.textTheme.bodyMedium?.color?.withOpacity(0.7),
                        leading: CircleAvatar(
                          backgroundColor: statusColor.withOpacity(0.1),
                          child: Icon(
                            entrega.integridadValidada ? Icons.check_circle : Icons.warning,
                            color: statusColor,
                          ),
                        ),
                        title: Text(
                          entrega.loteId,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: theme.textTheme.bodyLarge?.color,
                          ),
                        ),
                        subtitle: Text(
                          'Receptor: ${entrega.receptorFirmaId}',
                          style: TextStyle(
                            color: theme.textTheme.bodyMedium?.color?.withOpacity(0.7), 
                            fontSize: 13
                          ),
                        ),
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(
                              left: 16.0, 
                              right: 16.0, 
                              bottom: 16.0
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Divider(color: theme.dividerColor),
                                _buildDetailText(context, 'Fecha Escaneo', entrega.timestampEntrega),
                                const SizedBox(height: 6),
                                _buildDetailText(
                                  context,
                                  'Estado de Integridad', 
                                  entrega.integridadValidada ? 'Válido' : 'Alterado'
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  'Hash Origen (Firmado):',
                                  style: TextStyle(
                                    color: theme.textTheme.bodyMedium?.color?.withOpacity(0.5) ?? Colors.grey, 
                                    fontSize: 11
                                  ),
                                ),
                                SelectableText(
                                  entrega.hashOrigen,
                                  style: TextStyle(
                                    fontFamily: 'monospace',
                                    fontSize: 10,
                                    color: theme.textTheme.bodyMedium?.color,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Hash Recepción (Recalculado):',
                                  style: TextStyle(
                                    color: theme.textTheme.bodyMedium?.color?.withOpacity(0.5) ?? Colors.grey, 
                                    fontSize: 11
                                  ),
                                ),
                                SelectableText(
                                  entrega.hashCalculadoRecepcion,
                                  style: TextStyle(
                                    fontFamily: 'monospace',
                                    fontSize: 10,
                                    color: statusColor,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton.icon(
                                    onPressed: () {
                                      if (entrega.id != null) {
                                        _deleteEntrega(entrega.id!);
                                      }
                                    },
                                    icon: const Icon(Icons.delete, size: 16, color: Colors.redAccent),
                                    label: const Text('Eliminar Fila', style: TextStyle(color: Colors.redAccent, fontSize: 13)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.history_toggle_off, size: 80, color: theme.textTheme.bodyMedium?.color?.withOpacity(0.4) ?? Colors.grey),
          const SizedBox(height: 16),
          Text(
            'Sin entregas locales registradas',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: theme.textTheme.bodyLarge?.color,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Escanea códigos QR en campo para poblar la base de datos.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: theme.textTheme.bodyMedium?.color?.withOpacity(0.6) ?? Colors.grey,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailText(BuildContext context, String label, String value) {
    final theme = Theme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: theme.textTheme.bodyMedium?.color?.withOpacity(0.6) ?? Colors.grey, fontSize: 13)),
        Text(value, style: TextStyle(color: theme.textTheme.bodyLarge?.color, fontSize: 13)),
      ],
    );
  }
}
