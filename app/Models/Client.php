<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_type',
        'document_number',
        'verification_digit',
        'name',
        'department_id',
        'city_id',
        'phone',
        'cellphone',
        'address',
        'email',
        'is_active',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }
}
