<?php

namespace App\Models;

use App\Models\Concerns\BroadcastsModelChanges;
use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    use BroadcastsModelChanges;

    protected $broadcastChannelName = 'admin';

    protected $fillable = [
        'name',
        'label',
        'description',
        'is_active',
        'guard_name',
    ];
}
