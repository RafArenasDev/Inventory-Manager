<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BroadcastsModelChanges;
use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    use Auditable, BroadcastsModelChanges;

    protected $broadcastChannelName = 'admin';

    protected $fillable = [
        'name',
        'label',
        'description',
        'is_active',
        'guard_name',
    ];

    public function auditLabel(): string
    {
        return 'Rol '.($this->label ?? $this->name);
    }
}
