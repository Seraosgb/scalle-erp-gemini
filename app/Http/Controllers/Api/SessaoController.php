<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessaoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tokens = $request->user()->tokens()->orderByDesc('last_used_at')->get();
        return response()->json(['data' => $tokens]);
    }

    public function revogar(Request $request, string $id): JsonResponse
    {
        $token = $request->user()->tokens()->where('id', $id)->firstOrFail();
        $token->delete();
        
        return response()->json(['data' => ['message' => 'Sessão desconectada com sucesso.']]);
    }
}