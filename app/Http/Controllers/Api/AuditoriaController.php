<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditoriaLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditoriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = AuditoriaLog::where('tenant_id', $tenantId)->with('usuario:id,name,email');

        if ($request->filled('acao')) {
            $query->where('acao', $request->get('acao'));
        }

        if ($request->filled('entidade')) {
            $query->where('tabela_entidade', $request->get('entidade'));
        }

        $logs = $query->orderByDesc('created_at')->paginate(20);
        return response()->json($logs);
    }
}