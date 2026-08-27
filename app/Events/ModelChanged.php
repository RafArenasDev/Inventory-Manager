<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class ModelChanged implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(
        public string $channelName,
        public string $model,
        public string $action,
        public int|string $id,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel($this->channelName)];
    }

    public function broadcastAs(): string
    {
        return 'model.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'model' => $this->model,
            'action' => $this->action,
            'id' => $this->id,
        ];
    }
}
