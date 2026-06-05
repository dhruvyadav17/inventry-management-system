<?php

return [
    'schedule' => [
        'sanctum_prune_expired' => [
            'command' => 'sanctum:prune-expired --hours=24',
            'frequency' => env('SANCTUM_PRUNE_FREQUENCY', 'daily'),
            'without_overlapping' => true,
        ],
    ],
];
