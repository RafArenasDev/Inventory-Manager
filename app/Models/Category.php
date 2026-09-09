<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use Auditable, BroadcastsModelChanges, HasFactory;

    protected $broadcastChannelName = 'inventory';

    protected $fillable = ['name', 'description', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function auditLabel(): string
    {
        return 'Categoría '.$this->name;
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
