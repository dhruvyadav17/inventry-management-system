<?php

use Illuminate\Support\Facades\Schedule;

foreach (config('maintenance.schedule', []) as $job) {
    $event = Schedule::command($job['command']);
    $frequency = $job['frequency'] ?? 'daily';

    method_exists($event, $frequency) ? $event->{$frequency}() : $event->daily();

    if ($job['without_overlapping'] ?? true) {
        $event->withoutOverlapping();
    }
}
