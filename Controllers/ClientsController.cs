using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using lab_8.Models;

namespace lab_8.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClientsController : ControllerBase
{
    private readonly RentalDbContext _context;

    public ClientsController(RentalDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Client>>> GetAll()
    {
        return await _context.Clients.OrderBy(c => c.Id).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Client>> GetById(int id)
    {
        var client = await _context.Clients.FindAsync(id);
        if (client == null)
            return NotFound(new { message = "Клієнта не знайдено." });

        return client;
    }

    [HttpPost]
    public async Task<ActionResult<Client>> Create(ClientDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.LastName) ||
            string.IsNullOrWhiteSpace(dto.FirstName) ||
            string.IsNullOrWhiteSpace(dto.PassportNumber))
        {
            return BadRequest(new { message = "Прізвище, Ім'я та Паспорт є обов'язковими." });
        }

        var client = new Client
        {
            LastName = dto.LastName.Trim(),
            FirstName = dto.FirstName.Trim(),
            MiddleName = string.IsNullOrWhiteSpace(dto.MiddleName) ? null : dto.MiddleName.Trim(),
            PassportNumber = dto.PassportNumber.Trim(),
            Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address.Trim(),
            Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim()
        };

        _context.Clients.Add(client);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = client.Id }, client);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Client>> Update(int id, ClientDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.LastName) ||
            string.IsNullOrWhiteSpace(dto.FirstName) ||
            string.IsNullOrWhiteSpace(dto.PassportNumber))
        {
            return BadRequest(new { message = "Прізвище, Ім'я та Паспорт є обов'язковими." });
        }

        var client = await _context.Clients.FindAsync(id);
        if (client == null)
            return NotFound(new { message = "Клієнта не знайдено." });

        client.LastName = dto.LastName.Trim();
        client.FirstName = dto.FirstName.Trim();
        client.MiddleName = string.IsNullOrWhiteSpace(dto.MiddleName) ? null : dto.MiddleName.Trim();
        client.PassportNumber = dto.PassportNumber.Trim();
        client.Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address.Trim();
        client.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();

        await _context.SaveChangesAsync();

        return Ok(client);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var client = await _context.Clients.FindAsync(id);
        if (client == null)
            return NotFound(new { message = "Клієнта не знайдено." });

        if (await _context.Rentals.AnyAsync(r => r.ClientId == id))
            return Conflict(new { message = "Неможливо видалити клієнта, оскільки він має активну оренду." });

        try
        {
            _context.Clients.Remove(client);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Неможливо видалити клієнта, оскільки він має активну оренду." });
        }
    }
}

public record ClientDto(
    string LastName,
    string FirstName,
    string? MiddleName,
    string PassportNumber,
    string? Address,
    string? Phone
);